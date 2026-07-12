"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, MapPin, Grid, List, Tag, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { withCustomButton } from "@/components/custom/button_custom";
import { DUMMY_TILES, TileItem, getRarityBadgeColor } from "@/lib/tiles";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ButtonCustom = withCustomButton("button");
const LinkCustom = withCustomButton(Link);

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRarity, setSelectedRarity] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc">("price-desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 3;

  // Local purchase dialog states
  const [selectedTile, setSelectedTile] = useState<TileItem | null>(null);
  const [purchaseStep, setPurchaseStep] = useState<"confirm" | "success">("confirm");
  const [txHash, setTxHash] = useState("");

  // Reset to first page when search, rarity or sorting changes
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleRarityChange = (val: string) => {
    setSelectedRarity(val);
    setCurrentPage(1);
  };

  const handleSortChange = (val: "price-asc" | "price-desc") => {
    setSortBy(val);
    setCurrentPage(1);
  };

  // Filtering logic
  const filteredTiles = DUMMY_TILES.filter((tile) => {
    const matchesSearch =
      tile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tile.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tile.coordinates.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRarity = selectedRarity === "All" || tile.rarity === selectedRarity;

    return matchesSearch && matchesRarity;
  }).sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    return b.price - a.price;
  });

  const totalPages = Math.ceil(filteredTiles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTiles = filteredTiles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getRarityBadgeColor = (rarity: TileItem["rarity"]) => {
    switch (rarity) {
      case "Legendary":
        return "bg-amber-500/10 text-amber-500 border-amber-500/25";
      case "Epic":
        return "bg-purple-500/10 text-purple-500 border-purple-500/25";
      case "Rare":
        return "bg-cyan-500/10 text-cyan-500 border-cyan-500/25";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-700/50";
    }
  };

  const handleBuy = (tile: TileItem) => {
    setSelectedTile(tile);
    setPurchaseStep("confirm");
    setTxHash("");
  };

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-24 font-sans">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-[68px] space-y-12">
        
        {/* Marketplace Header */}
        <div className="space-y-4 max-w-2xl">
          <span className="text-primary text-sm font-semibold tracking-widest uppercase">
            Blockland Marketplace
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
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
        {paginatedTiles.length > 0 ? (
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
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent opacity-60" />
                      <span className={`absolute top-4 left-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border backdrop-blur-md ${getRarityBadgeColor(tile.rarity)}`}>
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
                          <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
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
                            <img
                              src={tile.publisher.avatar}
                              alt={tile.publisher.name}
                              className="w-6 h-6 rounded-full object-cover border border-zinc-800"
                            />
                            <div className="flex flex-col">
                              <span className="font-semibold text-zinc-300">{tile.publisher.name}</span>
                              <span className="text-[10px] text-zinc-550 font-mono">{tile.publisher.walletAddress}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-zinc-550 font-mono">{tile.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <div className="space-y-0.5">
                          <div className="text-xs text-zinc-500 uppercase tracking-wide font-mono">
                            Price
                          </div>
                          <div className="text-lg font-bold text-primary font-mono">
                            {tile.price} USDC
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <LinkCustom href={`/marketplace/${tile.id}`} variant="outline">
                            Detail
                          </LinkCustom>
                          <ButtonCustom onClick={() => handleBuy(tile)}>
                            Buy Tile
                          </ButtonCustom>
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
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getRarityBadgeColor(tile.rarity)}`}>
                            {tile.rarity}
                          </span>
                          <span className="text-[11px] text-zinc-555 font-mono flex items-center gap-1">
                            <Grid className="h-3 w-3" />
                            {tile.coordinates}
                          </span>
                          <span className="text-[10px] text-zinc-555 font-mono">• {tile.date}</span>
                        </div>
                        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                          {tile.name}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <p className="text-xs text-zinc-400 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-zinc-550" />
                            {tile.location}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <img
                              src={tile.publisher.avatar}
                              alt={tile.publisher.name}
                              className="w-4 h-4 rounded-full object-cover border border-zinc-800"
                            />
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
                        <div className="text-lg font-bold text-primary font-mono">
                          {tile.price} USDC
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <LinkCustom href={`/marketplace/${tile.id}`} variant="outline">
                          Detail
                        </LinkCustom>
                        <ButtonCustom onClick={() => handleBuy(tile)}>
                          Buy Tile
                        </ButtonCustom>
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
            <h3 className="font-bold text-lg text-white">No tiles found</h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto">
              We couldn't find any listings matching your search or filters. Try adjusting them.
            </p>
          </div>
        )}
      </div>

      {/* Local Purchase Dialog */}
      <Dialog open={!!selectedTile} onOpenChange={(open) => !open && setSelectedTile(null)}>
        <DialogContent className="max-w-2xl bg-zinc-950 border border-zinc-800 text-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white tracking-tight">
              {purchaseStep === "confirm" ? "Confirm Purchase" : "Transaction Success"}
            </DialogTitle>
          </DialogHeader>

          {selectedTile && purchaseStep === "confirm" && (
            <div className="space-y-6 text-zinc-300 mt-4">
              <div className="flex gap-4 items-start border-b border-zinc-800 pb-4">
                <img
                  src={selectedTile.imageUrl}
                  alt={selectedTile.name}
                  className="w-20 h-20 object-cover rounded-lg border border-zinc-805"
                />
                <div className="space-y-1">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getRarityBadgeColor(selectedTile.rarity)}`}>
                    {selectedTile.rarity}
                  </span>
                  <h4 className="font-semibold text-white mt-1">{selectedTile.name}</h4>
                  <p className="text-xs text-zinc-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {selectedTile.location}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Publisher</span>
                  <span className="font-semibold text-white flex items-center gap-2">
                    <img
                      src={selectedTile.publisher.avatar}
                      alt={selectedTile.publisher.name}
                      className="w-5 h-5 rounded-full object-cover border border-zinc-700"
                    />
                    {selectedTile.publisher.name} ({selectedTile.publisher.walletAddress})
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Listed Date</span>
                  <span className="font-semibold text-zinc-300">{selectedTile.date}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Price</span>
                  <span className="font-semibold text-primary">{selectedTile.price} USDC</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Transaction Fee</span>
                  <span className="text-zinc-550">0.05 USDC</span>
                </div>
                <div className="border-t border-zinc-800 pt-3 flex justify-between font-bold text-white text-base">
                  <span>Total Cost</span>
                  <span className="text-primary">{selectedTile.price + 0.05} USDC</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTile(null)}
                  className="flex-1 border border-zinc-800 hover:bg-zinc-900 font-semibold py-3 rounded-xl transition-all cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPurchaseStep("success");
                    setTxHash("4v7yJ" + Math.random().toString(36).substring(2, 10) + "H98t1x");
                  }}
                  className="flex-1 bg-primary hover:bg-primary/95 text-black font-semibold py-3 rounded-xl transition-all cursor-pointer text-sm"
                >
                  Confirm Buy
                </button>
              </div>
            </div>
          )}

          {selectedTile && purchaseStep === "success" && (
            <div className="text-center space-y-4 py-4 mt-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-xl border border-emerald-500/20">
                ✓
              </div>
              <div>
                <h4 className="font-bold text-white text-lg">Tile Acquired!</h4>
                <p className="text-sm text-zinc-400 mt-1">
                  You are now the proud owner of <strong>{selectedTile.name}</strong> coordinate unit.
                </p>
              </div>
              <div className="text-xs font-mono bg-black p-3 rounded-lg border border-zinc-800 text-zinc-500 text-left overflow-x-auto">
                Tx: {txHash}
              </div>
              <ButtonCustom onClick={() => setSelectedTile(null)} className="w-full justify-center">
                Close
              </ButtonCustom>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
