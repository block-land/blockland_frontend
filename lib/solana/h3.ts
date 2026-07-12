/**
 * H3 hexagonal grid helpers.
 * Resolution 7 = ~5km² per hexagon. USA has ~2 million cells.
 */

import { latLngToCell, cellToBoundary, cellToLatLng, polygonToCells } from "h3-js";
import type { Feature, FeatureCollection, Polygon } from "geojson";

/**
 * Bounding box for the contiguous USA (approx).
 * Used as a geofence to restrict tile purchases to USA only.
 */
export const USA_BOUNDS = {
  minLat: 24.396308, // south (Texas)
  maxLat: 49.384358, // north (Minnesota)
  minLng: -125.0, // west (California)
  maxLng: -66.93457, // east (Maine)
};

/** Check whether a lat/lng point falls within the USA bounding box. */
export function isInUsaBounds(lat: number, lng: number): boolean {
  return (
    lat >= USA_BOUNDS.minLat &&
    lat <= USA_BOUNDS.maxLat &&
    lng >= USA_BOUNDS.minLng &&
    lng <= USA_BOUNDS.maxLng
  );
}

export const H3_RESOLUTION = 7;

/** Get the H3 cell index for a lat/lng. */
export function getCell(lat: number, lng: number): string {
  return latLngToCell(lat, lng, H3_RESOLUTION);
}

/**
 * Get the boundary of an H3 cell as a GeoJSON Polygon.
 * h3 returns [lat,lng] pairs, but GeoJSON needs [lng,lat].
 */
export function getCellBoundaryGeoJSON(cell: string): Polygon {
  const boundary = cellToBoundary(cell);
  const ring = boundary.map(([lat, lng]) => [lng, lat]);
  // Close the ring (GeoJSON requires first === last point)
  ring.push(ring[0]);
  return {
    type: "Polygon",
    coordinates: [ring],
  };
}

/** Get the center [lat, lng] of an H3 cell. */
export function getCellCenter(cell: string): { lat: number; lng: number } {
  const [lat, lng] = cellToLatLng(cell);
  return { lat, lng };
}

/**
 * Build a GeoJSON FeatureCollection of sold tiles for Mapbox rendering.
 * Each feature is the hexagon polygon; properties carry owner/label data.
 */
export function buildSoldTilesGeoJSON(
  tiles: Array<{
    h3Cell: string;
    owner: string;
    assetId: string;
    username?: string | null;
    photoUrl?: string | null;
  }>
): FeatureCollection {
  const ownerShort = (owner: string) =>
    `${owner.slice(0, 6)}...${owner.slice(-4)}`;
  return {
    type: "FeatureCollection",
    features: tiles.map((tile) => {
      const center = getCellCenter(tile.h3Cell);
      // Pre-format the label: "username\naddress" when username exists,
      // otherwise just the address. \n maps to a line break in Mapbox text.
      const label = tile.username
        ? `${tile.username}\n${ownerShort(tile.owner)}`
        : ownerShort(tile.owner);
      return {
        type: "Feature" as const,
        geometry: getCellBoundaryGeoJSON(tile.h3Cell),
        properties: {
          cell: tile.h3Cell,
          owner: tile.owner,
          ownerShort: ownerShort(tile.owner),
          username: tile.username ?? null,
          photoUrl: tile.photoUrl ?? null,
          label,
          lat: center.lat,
          lng: center.lng,
          assetId: tile.assetId,
          status: "sold",
        },
      };
    }) as Feature[],
  };
}

/**
 * Build a GeoJSON FeatureCollection of sold tile CENTROIDS as Points.
 * Used by the label layer — Mapbox renders exactly one symbol per Point,
 * which prevents duplicate labels that can appear when a symbol layer reads
 * from a polygon source across internal tile boundaries.
 */
export function buildSoldTilesCentroidsGeoJSON(
  tiles: Array<{
    h3Cell: string;
    owner: string;
    username?: string | null;
    photoUrl?: string | null;
  }>
): FeatureCollection {
  const ownerShort = (owner: string) =>
    `${owner.slice(0, 6)}...${owner.slice(-4)}`;
  return {
    type: "FeatureCollection",
    features: tiles.map((tile) => {
      const center = getCellCenter(tile.h3Cell);
      const label = tile.username
        ? `${tile.username}\n${ownerShort(tile.owner)}`
        : ownerShort(tile.owner);
      return {
        id: tile.h3Cell, // stable feature id → lets Mapbox dedup labels
        type: "Feature" as const,
        geometry: {
          type: "Point",
          coordinates: [center.lng, center.lat],
        },
        properties: {
          cell: tile.h3Cell,
          label,
          owner: tile.owner,
          username: tile.username ?? null,
          photoUrl: tile.photoUrl ?? null,
        },
      };
    }) as Feature[],
  };
}

/**
 * Enumerate H3 cell IDs covering a bounding box.
 * Unlike generateGridGeoJSON (which is conservative for continuous viewport
 * rendering), this returns raw cell IDs with a configurable cap so callers
 * like box-select can request more cells than the grid overlay allows.
 *
 * @returns cell IDs, or empty array if bounds too large / too many cells.
 */
export function getCellsInBounds(
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  maxCells: number = 1000,
  resolution: number = H3_RESOLUTION
): string[] {
  // NOTE: h3-js v4 expects polygon coordinates in [lat, lng] order (NOT GeoJSON
  // [lng, lat]). Swapping here is required — verified empirically that the
  // [lng, lat] order returns 0 cells.
  const polygon = [
    [
      [bounds.minLat, bounds.minLng],
      [bounds.minLat, bounds.maxLng],
      [bounds.maxLat, bounds.maxLng],
      [bounds.maxLat, bounds.minLng],
      [bounds.minLat, bounds.minLng],
    ],
  ];

  try {
    const cells = polygonToCells(polygon, resolution) ?? [];
    if (cells.length > maxCells) return [];
    return cells;
  } catch {
    return [];
  }
}

/**
 * Generate a GeoJSON FeatureCollection of H3 hex cells covering a viewport.
 * Used to render the clickable grid outline on the map.
 */
export function generateGridGeoJSON(
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  resolution: number = H3_RESOLUTION
): FeatureCollection {
  // NOTE: h3-js v4 expects polygon coordinates in [lat, lng] order (NOT GeoJSON
  // [lng, lat]). Output geometry is still proper GeoJSON via getCellBoundaryGeoJSON.
  const polygon = [
    [
      [bounds.minLat, bounds.minLng],
      [bounds.minLat, bounds.maxLng],
      [bounds.maxLat, bounds.maxLng],
      [bounds.maxLat, bounds.minLng],
      [bounds.minLat, bounds.minLng],
    ],
  ];

  let cells: string[] = [];
  
  // Calculate bounds size (width and height in degrees)
  const lngDiff = Math.abs(bounds.maxLng - bounds.minLng);
  const latDiff = Math.abs(bounds.maxLat - bounds.minLat);
  
  // Guard: if bounds are too large (e.g. zoomed out too far), avoid slow polygonToCells calculations.
  // Resolution 7 is about ~5km per hexagon (approx 0.05 degrees).
  // A threshold of 1.5 degrees is safe and matches typical local viewports at zoom >= 9.
  if (lngDiff > 1.5 || latDiff > 1.5) {
    return { type: "FeatureCollection", features: [] };
  }

  try {
    cells = polygonToCells(polygon, resolution) ?? [];
  } catch {
    // Too many cells or invalid bounds — return empty
    return { type: "FeatureCollection", features: [] };
  }

  // Safety cap to avoid freezing the browser on very wide zooms
  const MAX_CELLS = 2000;
  if (cells.length > MAX_CELLS) {
    return { type: "FeatureCollection", features: [] };
  }

  return {
    type: "FeatureCollection",
    features: cells.map((cell) => ({
      type: "Feature" as const,
      geometry: getCellBoundaryGeoJSON(cell),
      properties: { cell, status: "available" },
    })) as Feature[],
  };
}
