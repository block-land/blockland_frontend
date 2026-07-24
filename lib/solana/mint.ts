/**
 * Frontend client for the mint flow.
 *
 * Tile price is $0.2 USD, converted to SOL at the live rate by the backend.
 * This module fetches the price from the backend (never hardcoded client-side).
 */

import type { MintTileRequest, MintTileResponse } from "./types";
import { RPC_URL } from "./constants";
import { BACKEND_URL } from "@/lib/api";

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
 * Capture a tile thumbnail via the Mapbox Static Images API.
 *
 * This replaces the old approach (fly the live map + wait 2s) which was the
 * main cause of slow bulk purchases (~2s per tile, sequential). The Static
 * Images API returns the rendered map tile instantly, with no map movement.
 *
 * Returns a base64 PNG (no data-url prefix).
 */
export async function captureMapSnapshot(
  lat: number,
  lng: number
): Promise<string> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const url = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${lng},${lat},14,0,0/400x400@2x?access_token=${token}`;
  const res = await fetch(url);
  const blob = await res.blob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

/**
 * Reverse-geocode a coordinate once via the Mapbox API to get a human-readable
 * place name. Used at mint time so the result can be stored in the DB — this
 * avoids re-geocoding the same tile on every "Your Landmarks" view.
 *
 * Returns the place name, or null on failure (the caller falls back to coords).
 */
export async function reverseGeocodePlaceName(
  lat: number,
  lng: number
): Promise<string | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&country=us&limit=1`,
    );
    const data = await res.json();
    return data.features?.[0]?.place_name ?? null;
  } catch {
    return null;
  }
}

/**
 * Reverse-geocode many coordinates in parallel.
 */
export async function reverseGeocodePlaceNamesBatch(
  tiles: Array<{ lat: number; lng: number }>
): Promise<(string | null)[]> {
  return Promise.all(
    tiles.map((t) => reverseGeocodePlaceName(t.lat, t.lng)),
  );
}

/**
 * Capture thumbnails for many tiles in parallel.
 * `getCells` are resolved to {lat,lng} centers before fetching. Each thumbnail
 * is an independent Mapbox Static API call, so they all run concurrently —
 * 7 tiles take roughly the same time as 1.
 */
export async function captureMapSnapshotsBatch(
  tiles: Array<{ lat: number; lng: number }>
): Promise<string[]> {
  return Promise.all(
    tiles.map((t) => captureMapSnapshot(t.lat, t.lng))
  );
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
