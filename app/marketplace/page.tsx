"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, MapPin, Grid, List, Tag, SlidersHorizontal, ArrowUpDown, Loader2 } from "lucide-react";
import { withCustomButton } from "@/components/custom/button_custom";
import { getRarityBadgeColor } from "@/lib/tiles";
import { lamportsToSol } from "@/lib/solana/mint";
import Avatar from "boring-avatars";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const LinkCustom = withCustomButton(Link);

export interface TileItem {
  id: string;
  assetId: string;
  h3Cell: string;
  name: string;
  location: string;
  coordinates: string;
  rarity: "Legendary" | "Epic" | "Rare" | "Common";
  imageUrl: string;
  price: number; // in SOL desimal
  date: string;
  publisher: {
    name: string;
    walletAddress: string;
    avatar: string;
  };
}

/**
 * Build a Mapbox Static Images URL for a thumbnail map of a coordinate.
 * Uses dark-v11 to match the Blockland dark theme of the main map.
 */
function buildStaticMapUrl(lng: number, lat: number): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${lng},${lat},14,0,0/400x225@2x?access_token=${token}`;
}

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRarity, setSelectedRarity] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc">("price-desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const [tiles, setTiles] = useState<TileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalTilesCount, setTotalTilesCount] = useState(0);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when search, rarity or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedRarity, sortBy]);

  const loadTiles = useCallback(async (page: number, searchVal: string, rarityVal: string, sortVal: string) => {
    setLoading(true);
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const searchParam = searchVal.trim() ? `&search=${encodeURIComponent(searchVal.trim())}` : "";
      const rarityParam = rarityVal !== "All" ? `&rarity=${rarityVal}` : "";
      const sortParam = `&sort=${sortVal}`;

      const res = await fetch(
        `${BACKEND_URL}/api/tiles?limit=${ITEMS_PER_PAGE}&offset=${offset}${searchParam}${rarityParam}${sortParam}&status=listed`
      );
      const data = await res.json();

      if (data.ok && Array.isArray(data.tiles)) {
        const mapped = data.tiles.map((t: any) => {
          const lat = parseFloat(t.lat);
          const lng = parseFloat(t.lng);
          const lamports = t.listingPriceLamports ? Number(t.listingPriceLamports) : 0;
          const createdAt = t.listedAt ? new Date(t.listedAt) : new Date();

          return {
            id: t.id,
            assetId: t.assetId,
            h3Cell: t.h3Cell,
            name: `BLT ${lat.toFixed(3)},${lng.toFixed(3)}`,
            location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            coordinates: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
            rarity: (t.rarity as TileItem["rarity"]) || "Common",
            imageUrl: buildStaticMapUrl(lng, lat),
            price: lamportsToSol(lamports),
            date: createdAt.toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            }),
            publisher: {
              name: t.publisherUsername || "Anonymous",
              walletAddress: t.owner,
              avatar: t.publisherPhotoUrl || "",
            },
            rawLat: lat,
            rawLng: lng,
          };
        });

        // Enrich the tiles with place names using reverse geocoding from Mapbox Places
        const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        const enriched = await Promise.all(
          mapped.map(async (tile: any) => {
            try {
              const geoRes = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${tile.rawLng},${tile.rawLat}.json?access_token=${token}&country=us&limit=1`
              );
              const geoData = await geoRes.json();
              const placeName = geoData.features?.[0]?.place_name;
              return placeName
                ? {
                    ...tile,
                    location: placeName,
                    name: placeName.split(",")[0],
                  }
                : tile;
            } catch (err) {
              console.error("Geocoding failed for marketplace tile:", tile.id, err);
              return tile;
            }
          })
        );

        setTiles(enriched);
        setTotalTilesCount(data.total ?? enriched.length);
      } else {
        setTiles([]);
        setTotalTilesCount(0);
      }
    } catch (err) {
      console.error("Failed to load marketplace tiles:", err);
      setTiles([]);
      setTotalTilesCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTiles(currentPage, debouncedSearchQuery, selectedRarity, sortBy);
  }, [currentPage, debouncedSearchQuery, selectedRarity, sortBy, loadTiles]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
  };

  const handleRarityChange = (val: string) => {
    setSelectedRarity(val);
  };

  const handleSortChange = (val: "price-asc" | "price-desc") => {
    setSortBy(val);
  };

  const totalPages = Math.ceil(totalTilesCount / ITEMS_PER_PAGE);
  const paginatedTiles = tiles;

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-24 font-sans">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-[68px] space-y-12">
        
        {/* Marketplace Header */}
        <div className="space-y-4 max-w-2xl">
          <span className="text-primary text-sm font-semibold tracking-widest uppercase">
            Blockland Marketplace
          </span>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white">
            Coordinate Unit <span className="text-primary">Marketplace</span>
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Discover, buy, and trade unique grid coordinate tiles. Own a piece of the world economy built on Solana.
          </p>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between border-t border-b border-zinc-900 py-6">
          <div className="flex flex-1 flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative bg-zinc-950 flex gap-3 h-[48px] items-center px-4 rounded-xl border border-zinc-800 focus-within:border-zinc-700 flex-1">
              <Search className="h-5 w-5 text-zinc-500 shrink-0" />
              <input
                type="text"
                placeholder="Search by name, location or coordinate..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none p-0 text-[15px] font-normal text-white placeholder-zinc-500"
              />
            </div>

            {/* Rarity Select */}
            <div className="flex gap-2 items-center bg-zinc-950 px-4 h-[48px] rounded-xl border border-zinc-800">
              <SlidersHorizontal className="h-4 w-4 text-zinc-500" />
              <select
                value={selectedRarity}
                onChange={(e) => handleRarityChange(e.target.value)}
                className="bg-transparent border-none outline-none focus:ring-0 text-[15px] text-zinc-300 font-medium cursor-pointer py-1"
              >
                <option value="All" className="bg-zinc-950 text-white">All Rarity</option>
                <option value="Legendary" className="bg-zinc-950 text-white">Legendary</option>
                <option value="Epic" className="bg-zinc-950 text-white">Epic</option>
                <option value="Rare" className="bg-zinc-950 text-white">Rare</option>
                <option value="Common" className="bg-zinc-950 text-white">Common</option>
              </select>
            </div>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 p-1 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-primary text-black"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
                title="Grid View"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "list"
                    ? "bg-primary text-black"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 items-center bg-zinc-950 px-4 h-[48px] rounded-xl border border-zinc-800">
              <ArrowUpDown className="h-4 w-4 text-zinc-500" />
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as any)}
                className="bg-transparent border-none outline-none focus:ring-0 text-[15px] text-zinc-300 font-medium cursor-pointer py-1"
              >
                <option value="price-desc" className="bg-zinc-950 text-white">Price: High to Low</option>
                <option value="price-asc" className="bg-zinc-950 text-white">Price: Low to High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Marketplace Grid / List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-555">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
            <p className="text-sm">Loading listed coordinates from Solana...</p>
          </div>
        ) : paginatedTiles.length > 0 ? (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedTiles.map((tile) => (
                  <div
                    key={tile.id}
                    className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-800 transition-all hover:scale-[1.01] flex flex-col group"
                  >
                    {/* Photo & Rarity Badge */}
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={tile.imageUrl}
                        alt={tile.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-zinc-950 to-transparent opacity-60" />
                      <span className={`absolute top-4 left-4 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border backdrop-blur-md ${getRarityBadgeColor(tile.rarity)}`}>
                        {tile.rarity}
                      </span>
                      <div className="absolute bottom-4 left-4 flex gap-1 items-center text-zinc-300 text-xs font-mono">
                        <Grid className="h-3.5 w-3.5 text-primary" />
                        <span>{tile.coordinates}</span>
                      </div>
                    </div>

                    {/* Details info */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold text-white group-hover:text-primary transition-colors">
                            {tile.name}
                          </h3>
                          <p className="text-sm text-zinc-400 flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-zinc-550" />
                            {tile.location}
                          </p>
                        </div>

                        {/* Publisher info */}
                        <div className="flex items-center justify-between text-xs border-t border-b border-zinc-900/50 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-zinc-800 shrink-0">
                              {tile.publisher.avatar ? (
                                <img
                                  src={tile.publisher.avatar}
                                  alt={tile.publisher.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Avatar
                                  colors={["#f5e1a4", "#d9d593", "#ee7f27", "#bc162a", "#302325"]}
                                  variant="pixel"
                                  size={24}
                                />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-zinc-300 truncate">{tile.publisher.name}</span>
                              <span className="text-[10px] text-zinc-550 font-mono truncate">{tile.publisher.walletAddress ? `${tile.publisher.walletAddress.slice(0, 4)}...${tile.publisher.walletAddress.slice(-4)}` : ""}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-zinc-555 font-mono">{tile.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <div className="space-y-0.5">
                          <div className="text-xs text-zinc-500 uppercase tracking-wide font-mono">
                            Price
                          </div>
                          <div className="text-lg font-semibold text-primary font-mono">
                            {tile.price.toFixed(5)} SOL
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <LinkCustom href={`/marketplace/${tile.id}`} variant="outline">
                            Detail
                          </LinkCustom>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {paginatedTiles.map((tile) => (
                  <div
                    key={tile.id}
                    className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-800 transition-all p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Thumbnail */}
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 hidden sm:block">
                        <img
                          src={tile.imageUrl}
                          alt={tile.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      {/* Details */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${getRarityBadgeColor(tile.rarity)}`}>
                            {tile.rarity}
                          </span>
                          <span className="text-[11px] text-zinc-555 font-mono flex items-center gap-1">
                            <Grid className="h-3 w-3" />
                            {tile.coordinates}
                          </span>
                          <span className="text-[10px] text-zinc-555 font-mono">• {tile.date}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                          {tile.name}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <p className="text-xs text-zinc-400 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-zinc-550" />
                            {tile.location}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <div className="w-4 h-4 rounded-full overflow-hidden border border-zinc-850 shrink-0">
                              {tile.publisher.avatar ? (
                                <img
                                  src={tile.publisher.avatar}
                                  alt={tile.publisher.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Avatar
                                  colors={["#f5e1a4", "#d9d593", "#ee7f27", "#bc162a", "#302325"]}
                                  variant="pixel"
                                  size={16}
                                />
                              )}
                            </div>
                            <span>
                              Publisher: <span className="font-semibold text-zinc-300">{tile.publisher.name}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-zinc-900">
                      <div className="text-left md:text-right space-y-0.5">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wide font-mono">
                          Price
                        </div>
                        <div className="text-lg font-semibold text-primary font-mono">
                          {tile.price.toFixed(5)} SOL
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <LinkCustom href={`/marketplace/${tile.id}`} variant="outline">
                          Detail
                        </LinkCustom>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-8 border-t border-zinc-900">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 pl-2.5 pr-3 py-2 text-sm font-semibold border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      >
                        <PaginationPrevious className="pointer-events-none" />
                      </button>
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <PaginationItem key={idx}>
                        <PaginationLink
                          isActive={currentPage === idx + 1}
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(idx + 1);
                          }}
                          className={`cursor-pointer ${currentPage === idx + 1 ? "!bg-primary !text-black border-0" : "border-zinc-800 text-zinc-400"}`}
                        >
                          {idx + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 pl-3 pr-2.5 py-2 text-sm font-semibold border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      >
                        <PaginationNext className="pointer-events-none" />
                      </button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 border border-dashed border-zinc-800 rounded-2xl space-y-4">
            <div className="text-4xl">🗺️</div>
            <h3 className="font-semibold text-lg text-white">No tiles found</h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto">
              We couldn't find any listings matching your search or filters. Try adjusting them.
            </p>
          </div>
        )}
      </div>

      {/* Purchases happen on the detail page (app/marketplace/[id]/page.tsx). */}
    </div>
  );
}
