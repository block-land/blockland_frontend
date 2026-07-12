/**
 * Shared types for tile minting flow (frontend <-> backend).
 */

export interface TileMetadata {
  name: string;
  description: string;
  image: string; // Irys/Arweave URI
  symbol: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    files: Array<{ uri: string; type: string }>;
    category: string;
  };
}

export interface MintTileRequest {
  /** Buyer's wallet address (the cNFT recipient). */
  buyer: string;
  /** Tile latitude (-90..90). */
  lat: number;
  /** Tile longitude (-180..180). */
  lng: number;
  /** Base64-encoded PNG image of the Mapbox tile snapshot. */
  imageBase64: string;
  /** Rarity tier. */
  rarity: "Legendary" | "Epic" | "Rare" | "Common";
}

export interface MintTileResponse {
  ok: boolean;
  /** The minted cNFT asset id. */
  assetId?: string;
  /** Transaction signature. */
  signature?: string;
  /** Irys metadata URI. */
  metadataUri?: string;
  error?: string;
}
