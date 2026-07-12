/**
 * Blockland on-chain addresses & config.
 *
 * These values come from the admin setup (`anchor/scripts/setup-result.json`)
 * and the program deploy. Update them if you redeploy or re-setup.
 */

export const PROGRAM_ID =
  process.env.NEXT_PUBLIC_PROGRAM_ID ??
  "DvZRK39ocQRhoQL4cDRXHnWZFRPeKM4XZ7jtfdwwVqNN";

export const MERKLE_TREE =
  process.env.NEXT_PUBLIC_MERKLE_TREE ??
  "89A62B9Bn45Nofa5CQXFUdyPPuo5Eth3rJkB288XWWGz";

export const COLLECTION_MINT =
  process.env.NEXT_PUBLIC_COLLECTION_MINT ??
  "FAtKx1TCQ9HZzoEfpo8DGatb9s6qUypQXJ7UvZWS1zSc";

export const TREASURY =
  process.env.NEXT_PUBLIC_TREASURY ??
  "4JDGwFWszhntY6N47r2u7QFjGRqeG8A8Pc3wgUkVY1mX";

/**
 * Active Solana cluster: "devnet" | "mainnet-beta".
 * Defaults to devnet so forgetting the var never routes to mainnet by accident.
 * NOTE: this drives read RPC, DAS API host, Solscan links, and UI labels —
 * the connected wallet (Phantom/Solflare) still controls its own cluster.
 */
export const SOLANA_CLUSTER =
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";

export const IS_MAINNET = SOLANA_CLUSTER === "mainnet-beta";

export const RPC_URL =
  process.env.NEXT_PUBLIC_HELIUS_RPC_URL ??
  "https://api.devnet.solana.com";

export const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY ?? "";

/** DAS API base URL for Helius (used for reading cNFTs). Host follows cluster. */
export const DAS_API_URL = HELIUS_API_KEY
  ? `https://${IS_MAINNET ? "mainnet" : "devnet"}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : RPC_URL;

/** Network label shown in UI. */
export const NETWORK_LABEL = IS_MAINNET ? "Solana Mainnet" : "Solana Devnet";

/**
 * Solscan cluster query param appended to account links. Empty for mainnet
 * (the default); "?cluster=devnet" for devnet/testnet.
 */
export const SOLSCAN_CLUSTER_PARAM = IS_MAINNET ? "" : "?cluster=devnet";

/** Derive the config PDA. */
export function configPda(programId: string = PROGRAM_ID): string {
  // This is computed client-side via web3.js in helpers; kept here for reference.
  return programId;
}
