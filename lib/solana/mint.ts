/**
 * Frontend client for the mint flow.
 *
 * Tile price is $0.2 USD, converted to SOL at the live rate by the backend.
 * This module fetches the price from the backend (never hardcoded client-side).
 */

import type { MintTileRequest, MintTileResponse } from "./types";
import { RPC_URL } from "./constants";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const LAMPORTS_PER_SOL = 1_000_000_000;

export type RarityTier = "Legendary" | "Epic" | "Rare" | "Common";

export interface TilePrice {
  usd: number;
  sol: number;
  lamports: number;
  solPrice: number;
}

/** Cached price to avoid refetching on every render. */
let cachedPrice: TilePrice | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000; // 30 seconds

/**
 * Fetch the current tile price from the backend ($0.2 → SOL at live rate).
 */
export async function getTilePrice(): Promise<TilePrice> {
  // Return cache if fresh
  if (cachedPrice && Date.now() - cacheTime < CACHE_TTL) {
    return cachedPrice;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/tiles/price`);
    const data = await res.json();
    if (data.ok) {
      cachedPrice = {
        usd: data.usd,
        sol: data.sol,
        lamports: data.lamports,
        solPrice: data.solPrice,
      };
      cacheTime = Date.now();
      return cachedPrice;
    }
  } catch {
    // ignore — fall back
  }

  // Fallback if backend unreachable
  return { usd: 0.2, sol: 0.2 / 78, lamports: Math.round((0.2 / 78) * LAMPORTS_PER_SOL), solPrice: 78 };
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Capture a snapshot of a Mapbox map canvas as a PNG base64 string.
 */
export async function captureMapSnapshot(
  map: mapboxgl.Map,
  lat: number,
  lng: number
): Promise<string> {
  // Fly to the coordinate first, then capture after render settles.
  map.flyTo({ center: [lng, lat], zoom: 14, duration: 1500 });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const canvas = map.getCanvas();
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.split(",")[1] ?? "";
}

/**
 * Fetch the wallet balance of a Solana public key in SOL.
 */
export async function getWalletBalance(address: string): Promise<number> {
  const { createSolanaRpc, address: solanaAddress } = await import("@solana/kit");
  const rpc = createSolanaRpc(RPC_URL);
  try {
    const balanceResponse = await rpc.getBalance(solanaAddress(address)).send();
    // Balance is returned in lamports, convert to SOL
    return Number(balanceResponse.value) / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error("Failed to fetch wallet balance:", error);
    return 0;
  }
}

/**
 * Call the backend mint endpoint (co-sign model).
 * Backend uploads image to Irys, mints cNFT, records sale.
 */
export async function mintTile(
  payload: MintTileRequest
): Promise<MintTileResponse> {
  const res = await fetch(`${BACKEND_URL}/api/tiles/mint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as MintTileResponse;
}
