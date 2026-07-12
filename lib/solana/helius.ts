/**
 * Helius DAS API client — read compressed NFTs (cNFTs).
 *
 * All methods hit the DAS (Digital Asset Standard) JSON-RPC endpoints,
 * which work for both compressed and regular NFTs.
 */

import { DAS_API_URL, COLLECTION_MINT } from "./constants";

/** A compressed NFT asset as returned by the DAS getAsset(s) methods. */
export interface CompressedNft {
  id: string;
  ownership: { owner: string };
  compression: {
    compressed: boolean;
    leafId?: number;
    tree: string;
  };
  content: {
    metadata: {
      name: string;
      symbol: string;
      image?: string;
      description?: string;
      attributes?: Array<{ trait_type: string; value: string | number }>;
    };
    json_uri: string;
  };
  grouping?: Array<{ group_key: string; group_value: string }>;
  mutable?: boolean;
}

interface DasResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

async function dasCall<T>(method: string, params: object): Promise<T> {
  const res = await fetch(DAS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "1", method, params }),
  });
  const json: DasResponse<T> = await res.json();
  if (json.error) {
    throw new Error(`DAS ${method} error: ${json.error.message}`);
  }
  if (!json.result) {
    throw new Error(`DAS ${method}: no result`);
  }
  return json.result;
}

/**
 * Get all compressed NFTs owned by a wallet, filtered to the Blockland
 * collection (so we don't show unrelated NFTs the wallet may own).
 */
export async function getOwnerTiles(wallet: string): Promise<CompressedNft[]> {
  try {
    const result = await dasCall<{ items: CompressedNft[] }>(
      "getAssetsByOwner",
      {
        ownerAddress: wallet,
        page: 1,
        limit: 100,
      }
    );

    // Filter to only Blockland collection NFTs (if collection filter applies)
    return (result.items ?? []).filter((asset) => {
      const inCollection = asset.grouping?.some(
        (g) => g.group_key === "collection" && g.group_value === COLLECTION_MINT
      );
      return asset.compression?.compressed && (inCollection ?? true);
    });
  } catch (err) {
    console.error("getOwnerTiles failed:", err);
    return [];
  }
}

/**
 * Get a single compressed NFT by its asset id.
 */
export async function getTile(assetId: string): Promise<CompressedNft | null> {
  try {
    const result = await dasCall<CompressedNft>("getAsset", {
      id: assetId,
    });
    return result ?? null;
  } catch (err) {
    console.error("getTile failed:", err);
    return null;
  }
}

/**
 * Get the Merkle proof for a compressed NFT (needed for transfers/burns).
 */
export interface AssetProof {
  root: string;
  proof: string[];
  nodeIndex: number;
  leaf: string;
  treeId: string;
}

export async function getAssetProof(assetId: string): Promise<AssetProof | null> {
  try {
    const result = await dasCall<AssetProof>("getAssetProof", {
      id: assetId,
    });
    return result ?? null;
  } catch (err) {
    console.error("getAssetProof failed:", err);
    return null;
  }
}
