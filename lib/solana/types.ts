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
  /** Human-readable place name (reverse-geocoded once at purchase). */
  placeName?: string;
  /**
   * On-chain signature proving the buyer transferred the tile price (in SOL)
   * to the custodian (dev wallet). The backend verifies this before minting.
   */
  paymentSignature?: string;
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

/** A single tile to mint as part of a bulk purchase. */
export interface BulkMintTile {
  lat: number;
  lng: number;
  /** Base64-encoded PNG image of the Mapbox tile snapshot. */
  imageBase64: string;
  /** Human-readable place name (reverse-geocoded once at purchase). */
  placeName?: string;
}

export interface BulkMintRequest {
  /** Buyer's wallet address (the cNFT recipient). */
  buyer: string;
  tiles: BulkMintTile[];
  /**
   * Single on-chain signature proving the buyer transferred the TOTAL price
   * (priceLamports × tiles.length) to the custodian (dev wallet).
   */
  paymentSignature: string;
}

export interface BulkMintResponse {
  ok: boolean;
  enqueuedCount?: number;
  skippedCount?: number;
  refundedLamports?: number;
  status?: string;
  error?: string;
}
