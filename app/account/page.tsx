"use client";

import React from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import {
  MapPin,
  Grid,
  Shield,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  User,
  Info,
  Tag,
  Loader2,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { getRarityBadgeColor } from "@/lib/tiles";
import { withCustomButton } from "@/components/custom/button_custom";
import { useDialogStore } from "@/store/useDialogStore";
import { getOwnerTiles, type CompressedNft } from "@/lib/solana/helius";
import { lamportsToSol, getWalletBalance } from "@/lib/solana/mint";
import {
  NETWORK_LABEL,
  SOLSCAN_CLUSTER_PARAM,
  IS_MAINNET,
  RPC_URL,
} from "@/lib/solana/constants";
import { useProfileStore } from "@/store/useProfileStore";
import Avatar from "boring-avatars";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import WalletButton from "@/components/wallet-button";

const ButtonCustom = withCustomButton("button");

interface OwnedTile {
  id: string;
  name: string;
  location: string;
  coordinates: string;
  rarity: "Legendary" | "Epic" | "Rare" | "Common";
  imageUrl: string;
  purchasePrice: number;
  purchasedDate: string;
}

/** Map a compressed NFT to the UI's OwnedTile shape. */
function nftToTile(nft: CompressedNft): OwnedTile {
  const latAttr = nft.content.metadata.attributes?.find(
    (a) => a.trait_type === "latitude",
  );
  const lngAttr = nft.content.metadata.attributes?.find(
    (a) => a.trait_type === "longitude",
  );
  const rarityAttr = nft.content.metadata.attributes?.find(
    (a) => a.trait_type === "rarity",
  );
  const lat = Number(latAttr?.value ?? 0);
  const lng = Number(lngAttr?.value ?? 0);

  return {
    id: nft.id,
    name: nft.content.metadata.name || "Unnamed Tile",
    location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    coordinates: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
    rarity: (rarityAttr?.value as OwnedTile["rarity"]) || "Common",
    imageUrl: nft.content.metadata.image || "",
    purchasePrice: 0.0025, // Fallback default price (approx $0.2 equivalent)
    purchasedDate: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
  };
}

export default function AccountPage() {
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const [copied, setCopied] = React.useState(false);
  const [ownedTiles, setOwnedTiles] = React.useState<OwnedTile[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Real Balances
  const [solBalance, setSolBalance] = React.useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = React.useState<number | null>(null);

  // Profile Store
  const { profileData, checkProfile } = useProfileStore();

  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);

  // Search state
  const [searchQuery, setSearchQuery] = React.useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 6;

  // Filter owned tiles based on query
  const filteredTiles = ownedTiles.filter((tile) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      tile.name.toLowerCase().includes(query) ||
      tile.location.toLowerCase().includes(query) ||
      tile.coordinates.toLowerCase().includes(query)
    );
  });

  // Reset page when tiles length or search query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, ownedTiles.length]);

  const totalPages = Math.ceil(filteredTiles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTiles = filteredTiles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Check/fetch profile when wallet connected
  React.useEffect(() => {
    if (wallet?.address) {
      checkProfile(wallet.address);
    }
  }, [wallet?.address, checkProfile]);

  // Fetch balances dynamically when wallet connects
  React.useEffect(() => {
    if (!wallet?.address) {
      setSolBalance(null);
      setUsdcBalance(null);
      return;
    }

    const fetchBalances = async () => {
      // 1. Fetch SOL Balance
      try {
        const bal = await getWalletBalance(wallet.address);
        setSolBalance(bal);
      } catch (err) {
        console.error("Error fetching SOL balance:", err);
      }

      // 2. Fetch USDC Balance
      try {
        const USDC_MINT = IS_MAINNET
          ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
          : "Gh9ZwEmdLJ8DscKNTMETqIG36ZPzSTuSAMrXJmW8kmQs";

        const res = await fetch(RPC_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getTokenAccountsByOwner",
            params: [
              wallet.address,
              { mint: USDC_MINT },
              { encoding: "jsonParsed" },
            ],
          }),
        });
        const data = await res.json();
        const accounts = data?.result?.value || [];
        let totalUsdc = 0;
        for (const acc of accounts) {
          const uiAmount =
            acc?.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
          if (typeof uiAmount === "number") {
            totalUsdc += uiAmount;
          }
        }
        setUsdcBalance(totalUsdc);
      } catch (err) {
        console.error("Error fetching USDC balance:", err);
        setUsdcBalance(0);
      }
    };

    fetchBalances();
  }, [wallet?.address]);

  const loadTiles = React.useCallback(async () => {
    if (!wallet?.address) return;
    setLoading(true);
    try {
      // 1. Fetch on-chain tiles (via Helius DAS)
      const nfts = await getOwnerTiles(wallet.address);

      // 2. Fetch backend DB tiles
      const BACKEND_URL =
        process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
      let dbTiles: any[] = [];
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/tiles/owner/${wallet.address}`,
        );
        const data = await res.json();
        if (data.ok && Array.isArray(data.tiles)) {
          dbTiles = data.tiles;
        }
      } catch (dbErr) {
        console.error("Failed to load tiles from backend database:", dbErr);
      }

      // Map on-chain tiles and enrich them with database details (real prices & dates)
      const mapped = nfts.map((nft) => {
        const uiTile = nftToTile(nft);
        const match = dbTiles.find((t) => t.assetId === nft.id);
        if (match) {
          const lamports = match.priceLamports
            ? Number(match.priceLamports)
            : 0;
          uiTile.purchasePrice = lamportsToSol(lamports);

          if (match.createdAt) {
            const createdAt = new Date(match.createdAt);
            uiTile.purchasedDate = createdAt.toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            });
          }
        }
        return uiTile;
      });

      // Fallback: If Helius DAS API returns nothing (common in dev environment),
      // populate owned tiles directly using backend DB records
      if (mapped.length === 0 && dbTiles.length > 0) {
        const fallbackMapped = dbTiles.map((t: any) => {
          const lat = parseFloat(t.lat);
          const lng = parseFloat(t.lng);
          const lamports = t.priceLamports ? Number(t.priceLamports) : 0;
          const createdAt = t.createdAt ? new Date(t.createdAt) : new Date();

          return {
            id: t.assetId,
            name: `BLT ${lat.toFixed(3)},${lng.toFixed(3)}`,
            location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            coordinates: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
            rarity: (t.rarity as OwnedTile["rarity"]) || "Common",
            imageUrl: t.imageUri || "",
            purchasePrice: lamportsToSol(lamports),
            purchasedDate: createdAt.toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            }),
          };
        });
        setOwnedTiles(fallbackMapped);
      } else {
        setOwnedTiles(mapped);
      }
    } catch (err) {
      console.error("Failed to load tiles:", err);
      setOwnedTiles([]);
    } finally {
      setLoading(false);
    }
  }, [wallet?.address]);

  React.useEffect(() => {
    loadTiles();
  }, [loadTiles]);

  const handleCopy = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortenAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const handleShowDetail = (tile: OwnedTile) => {
    openDialog(
      "Tile Details",
      <div className="space-y-6 text-zinc-300">
        <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-zinc-800">
          <img
            src={tile.imageUrl}
            alt={tile.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-955 to-transparent opacity-60" />
          <span
            className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border backdrop-blur-md ${getRarityBadgeColor(tile.rarity)}`}
          >
            {tile.rarity}
          </span>
          <div className="absolute bottom-3 left-3 flex gap-1 items-center text-zinc-300 text-xs font-mono">
            <Grid className="h-3.5 w-3.5 text-primary" />
            <span>{tile.coordinates}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-white">{tile.name}</h3>
            <p className="text-sm text-zinc-400 flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4 text-zinc-550 shrink-0" />
              {tile.location}
            </p>
          </div>

          <div className="h-px bg-zinc-800/80" />

          <div className="grid grid-cols-2 gap-4 text-sm font-mono">
            <div className="space-y-1">
              <span className="text-zinc-555">TILE ID</span>
              <p className="text-zinc-350 font-semibold">{tile.id}</p>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-555">PURCHASE PRICE</span>
              <p className="text-primary font-semibold">
                {tile.purchasePrice.toFixed(5)} SOL
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-555">ACQUIRED DATE</span>
              <p className="text-zinc-350 font-semibold">
                {tile.purchasedDate}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-555">BLOCKCHAIN</span>
              <p className="text-zinc-350 font-semibold">{NETWORK_LABEL}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <ButtonCustom onClick={closeDialog} className="w-full justify-center">
            Close
          </ButtonCustom>
        </div>
      </div>,
    );
  };

  const handleSellTile = (tile: OwnedTile) => {
    let priceInput = "";

    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!priceInput || parseFloat(priceInput) <= 0) return;

      openDialog(
        "Confirm Listing",
        <div className="space-y-6 text-zinc-300">
          <div className="flex gap-4 items-start border-b border-zinc-800 pb-4">
            <img
              src={tile.imageUrl}
              alt={tile.name}
              className="w-16 h-16 object-cover rounded-lg border border-zinc-800"
            />
            <div className="space-y-0.5">
              <span
                className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${getRarityBadgeColor(tile.rarity)}`}
              >
                {tile.rarity}
              </span>
              <h4 className="font-semibold text-white mt-1">{tile.name}</h4>
              <p className="text-xs text-zinc-400 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {tile.location}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Listing Price</span>
              <span className="font-semibold text-primary">
                {priceInput} SOL
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Platform Service Fee</span>
              <span className="text-zinc-500">1.5%</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleSellTile(tile)}
              className="flex-1 border border-zinc-800 hover:bg-zinc-900 font-semibold py-3 rounded-xl transition-all cursor-pointer text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                openDialog(
                  "Listing Successful",
                  <div className="text-center space-y-4 py-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-xl border border-emerald-500/20">
                      ✓
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg">
                        Tile Listed!
                      </h4>
                      <p className="text-sm text-zinc-400 mt-1">
                        <strong>{tile.name}</strong> is now listed for sale at{" "}
                        <strong>{priceInput} SOL</strong>.
                      </p>
                    </div>
                    <div className="text-xs font-mono bg-black p-3 rounded-lg border border-zinc-800 text-zinc-550 text-left overflow-x-auto">
                      Tx: 7s9aK...e98v1u
                    </div>
                    <ButtonCustom
                      onClick={closeDialog}
                      className="w-full justify-center"
                    >
                      Done
                    </ButtonCustom>
                  </div>,
                );
              }}
              className="flex-1 bg-primary hover:bg-primary/95 text-black font-semibold py-3 rounded-xl transition-all cursor-pointer text-sm"
            >
              Confirm Listing
            </button>
          </div>
        </div>,
      );
    };

    openDialog(
      "List Tile for Sale",
      <form onSubmit={handleFormSubmit} className="space-y-6 text-zinc-300">
        <div className="flex gap-4 items-start border-b border-zinc-800 pb-4">
          <img
            src={tile.imageUrl}
            alt={tile.name}
            className="w-16 h-16 object-cover rounded-lg border border-zinc-800"
          />
          <div className="space-y-0.5">
            <span
              className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${getRarityBadgeColor(tile.rarity)}`}
            >
              {tile.rarity}
            </span>
            <h4 className="font-semibold text-white mt-1">{tile.name}</h4>
            <p className="text-xs text-zinc-400 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {tile.location}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-555 uppercase tracking-wider font-mono">
            Set Listing Price
          </label>
          <div className="relative bg-black flex gap-2 h-[48px] items-center px-4 rounded-xl border border-zinc-800 focus-within:border-zinc-700">
            <input
              type="number"
              step="0.0001"
              placeholder="e.g. 0.05"
              onChange={(e) => {
                priceInput = e.target.value;
              }}
              className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none p-0 text-[15px] font-normal text-white placeholder-zinc-650"
              required
            />
            <span className="text-xs font-mono text-zinc-500 shrink-0 select-none">
              SOL
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={closeDialog}
            className="flex-1 border border-zinc-800 hover:bg-zinc-900 font-semibold py-3 rounded-xl transition-all cursor-pointer text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-primary hover:bg-primary/95 text-black font-semibold py-3 rounded-xl transition-all cursor-pointer text-sm"
          >
            List Item
          </button>
        </div>
      </form>,
    );
  };

  // Redirect to Wallet Connect View if wallet is not connected
  if (!wallet) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 font-sans">
        <div className="flex flex-col items-center text-center space-y-4 max-w-sm px-6">
          <User className="h-16 w-16 text-zinc-700" />
          <h1 className="text-3xl font-extrabold tracking-tight">Connect Your Wallet</h1>
          <p className="text-zinc-550 text-sm leading-relaxed">
            Please connect your Solana wallet to view and manage your coordinate units.
          </p>
          <div className="pt-2">
            <WalletButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-24 font-sans">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-[68px] space-y-12">
        {/* Profile Card Header */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-3xl overflow-hidden">
                {wallet ? (
                  profileData?.photoUrl ? (
                    <img
                      src={profileData.photoUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="rounded-xl overflow-hidden isolate">
                      <Avatar
                        colors={[
                          "#f5e1a4",
                          "#d9d593",
                          "#ee7f27",
                          "#bc162a",
                          "#302325",
                        ]}
                        variant="pixel"
                        size={80}
                        square
                      />
                    </div>
                  )
                ) : (
                  <User className="h-10 w-10 text-zinc-555" />
                )}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-zinc-955 ${wallet ? "bg-emerald-500" : "bg-zinc-500"}`}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">
                  {profileData?.username || "Coordinate Owner"}
                </h1>
                <Shield className="h-4.5 w-4.5 text-primary shrink-0" />
              </div>
              <div className="flex items-center gap-2 text-zinc-400 text-sm font-mono">
                <span>
                  {wallet
                    ? shortenAddress(wallet.address)
                    : "Wallet not connected"}
                </span>
                {wallet && (
                  <button
                    onClick={handleCopy}
                    className="text-zinc-555 hover:text-white transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            {wallet && (
              <a
                href={`https://solscan.io/account/${wallet.address}${SOLSCAN_CLUSTER_PARAM}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
              >
                View Solscan <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 space-y-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-mono">
              Owned Tiles
            </span>
            <div className="text-3xl font-extrabold text-white font-mono">
              {ownedTiles.length} Units
            </div>
          </div>
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 space-y-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-mono">
              USDC Balance
            </span>
            <div className="text-3xl font-extrabold text-primary font-mono">
              {usdcBalance !== null
                ? `${usdcBalance.toFixed(2)} USDC`
                : "Loading..."}
            </div>
          </div>
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 space-y-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-mono">
              SOL Balance
            </span>
            <div className="text-3xl font-extrabold text-zinc-300 font-mono">
              {solBalance !== null
                ? `${solBalance.toFixed(4)} SOL`
                : "Loading..."}
            </div>
          </div>
        </div>

        {/* Owned Tiles Inventory Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Grid className="h-5 w-5 text-primary" /> Owned Coordinate Units
            </h2>
            
            <div className="flex items-center gap-4 flex-1 max-w-sm w-full">
              <div className="relative bg-zinc-950 flex gap-2.5 h-[40px] items-center px-3 rounded-xl border border-zinc-800 focus-within:border-zinc-700 flex-1">
                <Search className="h-4 w-4 text-zinc-550 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by name, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none p-0 text-sm text-white placeholder-zinc-600"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-zinc-555 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <span className="text-xs text-zinc-550 font-mono shrink-0">
                Showing {filteredTiles.length} of {ownedTiles.length} units
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
              <p className="text-sm">Loading your tiles from Solana...</p>
            </div>
          ) : ownedTiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-550 border border-dashed border-zinc-800 rounded-2xl">
              <Grid className="h-10 w-10 mb-4 text-zinc-700" />
              <p className="text-sm">You don't own any tiles yet.</p>
              <Link
                href="/landmark"
                className="mt-4 text-primary text-sm font-semibold hover:underline"
              >
                Explore the map →
              </Link>
            </div>
          ) : (
            <>
              {filteredTiles.length === 0 ? (
                <div className="text-center py-20 text-zinc-500 border border-dashed border-zinc-850 rounded-2xl">
                  No matching tiles found for "{searchQuery}".
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedTiles.map((tile) => (
                    <div
                      key={tile.id}
                      className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-800 transition-all hover:scale-[1.01] flex flex-col group"
                    >
                      {/* Photo & Rarity */}
                      <div className="relative aspect-video overflow-hidden">
                        <img
                          src={tile.imageUrl}
                          alt={tile.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-955 to-transparent opacity-60" />
                        <span
                          className={`absolute top-4 left-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border backdrop-blur-md ${getRarityBadgeColor(tile.rarity)}`}
                        >
                          {tile.rarity}
                        </span>
                        <div className="absolute bottom-4 left-4 flex gap-1 items-center text-zinc-300 text-xs font-mono">
                          <Grid className="h-3.5 w-3.5 text-primary" />
                          <span>{tile.coordinates}</span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                            {tile.name}
                          </h3>
                          <p className="text-sm text-zinc-400 flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-zinc-550" />
                            {tile.location}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-zinc-900 font-mono">
                          <div className="space-y-0.5">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                              Buy Price
                            </div>
                            <div className="text-base font-bold text-zinc-300">
                              {tile.purchasePrice.toFixed(5)} SOL
                            </div>
                          </div>

                          <div className="text-right space-y-0.5">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                              Acquired
                            </div>
                            <div className="text-xs font-semibold text-zinc-450">
                              {tile.purchasedDate}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 w-full pt-2">
                          <button
                            onClick={() => handleShowDetail(tile)}
                            className="flex-1 flex items-center justify-center gap-1.5 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 py-2.5 rounded-xl transition-all cursor-pointer font-semibold text-xs text-zinc-300"
                          >
                            <Info className="h-3.5 w-3.5" /> Detail
                          </button>
                          <button
                            onClick={() => handleSellTile(tile)}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/95 text-black py-2.5 rounded-xl transition-all cursor-pointer font-semibold text-xs"
                          >
                            <Tag className="h-3.5 w-3.5" /> Sell
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Pagination controls below the grid */}
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
          )}
        </div>
      </div>
    </div>
  );
}
