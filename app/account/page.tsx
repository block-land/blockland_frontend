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
import { getOwnerTiles, type CompressedNft } from "@/lib/solana/helius";
import { lamportsToSol, getWalletBalance } from "@/lib/solana/mint";
import { signAndSendBase64Tx } from "@/lib/solana/signing";
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
import { RiArrowRightUpLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { NumericFormat } from "react-number-format";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ButtonCustom = withCustomButton("button");
const LinkCustom = withCustomButton(Link);

interface OwnedTile {
  id: string;
  name: string;
  location: string;
  coordinates: string;
  rarity: "Legendary" | "Epic" | "Rare" | "Common";
  imageUrl: string;
  purchasePrice: number;
  purchasedDate: string;
  offersCount?: number;
  status?: "owned" | "listed" | "sold";
}

/** A tile the connected user has made an offer on (bidder view). */
interface MyOfferTile {
  tileId: string;
  assetId: string;
  offerId: string;
  name: string;
  location: string;
  coordinates: string;
  rarity: "Legendary" | "Epic" | "Rare" | "Common";
  imageUrl: string;
  offerPriceSol: number;
  offerStatus: "pending" | "accepted" | "declined" | "cancelled";
  offerDate: string;
  tileStatus: string;
  seller?: string;
  sellerUsername?: string;
  rawLat: number;
  rawLng: number;
}

/**
 * Build a Mapbox Static Images URL for a thumbnail map of a coordinate.
 * Uses dark-v11 to match the Blockland dark theme of the main map.
 */
function buildStaticMapUrl(lng: number, lat: number): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${lng},${lat},14,0,0/400x225@2x?access_token=${token}`;
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
    imageUrl: buildStaticMapUrl(lng, lat),
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

  // Search state
  const [searchQuery, setSearchQuery] = React.useState("");

  // Tab State: "all" or "listed" or "myoffers"
  const [activeTab, setActiveTab] = React.useState<
    "all" | "listed" | "myoffers"
  >("all");

  // Local dialog detail state
  const [selectedDetailTile, setSelectedDetailTile] =
    React.useState<OwnedTile | null>(null);

  // Local dialog offers state
  const [selectedOffersTile, setSelectedOffersTile] =
    React.useState<OwnedTile | null>(null);
  const [tileOffers, setTileOffers] = React.useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = React.useState(false);
  const [updatingOfferId, setUpdatingOfferId] = React.useState<string | null>(
    null
  );

  // My Offers tab state (tiles the connected user has bid on)
  const [myOffers, setMyOffers] = React.useState<MyOfferTile[]>([]);
  const [loadingMyOffers, setLoadingMyOffers] = React.useState(false);
  const [cancellingOfferId, setCancellingOfferId] = React.useState<
    string | null
  >(null);

  // Local dialog sell state
  const [sellingTile, setSellingTile] = React.useState<OwnedTile | null>(null);
  const [sellPriceInput, setSellPriceInput] = React.useState("");
  const [sellStatus, setSellStatus] = React.useState<
    "idle" | "confirm" | "success"
  >("idle");
  const [sellLoading, setSellLoading] = React.useState(false);
  const [sellError, setSellError] = React.useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 6;
  const [totalTilesCount, setTotalTilesCount] = React.useState(0);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when search query or active tab changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, activeTab]);

  const totalPages = Math.ceil(totalTilesCount / ITEMS_PER_PAGE);
  const paginatedTiles = ownedTiles;

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

  const loadTiles = React.useCallback(
    async (page: number, searchVal: string, statusVal: string) => {
      if (!wallet?.address) return;
      setLoading(true);
      try {
        const BACKEND_URL =
          process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

        const offset = (page - 1) * ITEMS_PER_PAGE;
        const searchParam = searchVal.trim()
          ? `&search=${encodeURIComponent(searchVal.trim())}`
          : "";
        const statusParam = `&status=${statusVal}`;

        const res = await fetch(
          `${BACKEND_URL}/api/tiles/owner/${wallet.address}?limit=${ITEMS_PER_PAGE}&offset=${offset}${searchParam}${statusParam}`,
        );
        const data = await res.json();

        if (data.ok && Array.isArray(data.tiles)) {
          const mapped = data.tiles.map((t: any) => {
            const lat = parseFloat(t.lat);
            const lng = parseFloat(t.lng);
            // If the tab is listed, display the listing/selling price (listingPriceLamports),
            // else display the last purchase price (priceLamports), which the
            // approve flow updates to the price actually paid by the buyer.
            const lamports =
              statusVal === "listed"
                ? t.listingPriceLamports
                  ? Number(t.listingPriceLamports)
                  : 0
                : t.priceLamports
                  ? Number(t.priceLamports)
                  : 0;
            // Purchase date = when the current owner acquired the tile (soldAt),
            // falling back to the mint/creation date for primary-owned tiles.
            const purchaseDate = t.soldAt
              ? new Date(t.soldAt)
              : t.createdAt
                ? new Date(t.createdAt)
                : new Date();

            return {
              id: t.assetId,
              name: `BLT ${lat.toFixed(3)},${lng.toFixed(3)}`,
              location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              coordinates: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
              rarity: (t.rarity as OwnedTile["rarity"]) || "Common",
              imageUrl: buildStaticMapUrl(lng, lat),
              purchasePrice: lamportsToSol(lamports),
              purchasedDate: purchaseDate.toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              }),
              rawLat: lat,
              rawLng: lng,
              offersCount: t.offersCount ?? 0,
              status: t.status,
            };
          });

          // Enrich the tiles with place names using reverse geocoding from Mapbox Places
          const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
          const enriched = await Promise.all(
            mapped.map(async (tile: any) => {
              try {
                const res = await fetch(
                  `https://api.mapbox.com/geocoding/v5/mapbox.places/${tile.rawLng},${tile.rawLat}.json?access_token=${token}&country=us&limit=1`,
                );
                const geoData = await res.json();
                const placeName = geoData.features?.[0]?.place_name;
                return placeName
                  ? {
                      ...tile,
                      location: placeName,
                      name: placeName.split(",")[0],
                    }
                  : tile;
              } catch (err) {
                console.error("Geocoding failed for tile:", tile.id, err);
                return tile;
              }
            }),
          );

          setOwnedTiles(enriched);
          setTotalTilesCount(data.total ?? enriched.length);
        } else {
          setOwnedTiles([]);
          setTotalTilesCount(0);
        }
      } catch (err) {
        console.error("Failed to load tiles:", err);
        setOwnedTiles([]);
        setTotalTilesCount(0);
      } finally {
        setLoading(false);
      }
    },
    [wallet?.address],
  );

  React.useEffect(() => {
    if (wallet?.address) {
      loadTiles(currentPage, debouncedSearchQuery, activeTab);
    }
  }, [
    currentPage,
    debouncedSearchQuery,
    activeTab,
    wallet?.address,
    loadTiles,
  ]);

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
    setSelectedDetailTile(tile);
  };

  const handleShowOffers = async (tile: OwnedTile) => {
    setSelectedOffersTile(tile);
    setLoadingOffers(true);
    try {
      const BACKEND_URL =
        process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
      const res = await fetch(`${BACKEND_URL}/api/tiles/${tile.id}/offers`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.offers)) {
        setTileOffers(data.offers);
      } else {
        setTileOffers([]);
      }
    } catch (err) {
      console.error("Failed to load offers:", err);
      setTileOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  };

  // Approve (-> "accepted") or Decline (-> "declined") an offer on the
  // currently-open offers tile. Updates the offer's status optimistically and
  // reverts on failure.
  const handleUpdateOfferStatus = async (
    offerId: string,
    status: "accepted" | "declined"
  ) => {
    if (!selectedOffersTile || !wallet || updatingOfferId) return;

    const prevOffers = tileOffers;
    setTileOffers((curr) =>
      curr.map((off) => (off.id === offerId ? { ...off, status } : off))
    );
    setUpdatingOfferId(offerId);

    try {
      const BACKEND_URL =
        process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
      // Settlement (tile transfer + SOL payout + refunding other offers) is
      // performed on-chain by the custodian, so the seller only needs to
      // authorize the action via the dedicated endpoint.
      const endpoint =
        status === "accepted" ? "approve" : "decline";
      const res = await fetch(
        `${BACKEND_URL}/api/tiles/${selectedOffersTile.id}/offers/${offerId}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seller: wallet.address }),
        }
      );
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || "Failed to update offer");
      }
      // On approve, the listing is settled (sold) so other pending offers are
      // auto-refunded/declined — refresh the visible list to reflect that.
      if (status === "accepted") {
        setTileOffers((curr) =>
          curr.map((off) =>
            off.id === offerId
              ? { ...off, status: "accepted" }
              : off.status === "pending"
                ? { ...off, status: "declined" }
                : off
          )
        );
      }
    } catch (err) {
      console.error("Failed to update offer:", err);
      setTileOffers(prevOffers);
    } finally {
      setUpdatingOfferId(null);
    }
  };

  // Load tiles the connected user has made offers on (bidder view).
  const loadMyOffers = React.useCallback(async () => {
    if (!wallet?.address) return;
    setLoadingMyOffers(true);
    try {
      const BACKEND_URL =
        process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
      const res = await fetch(
        `${BACKEND_URL}/api/tiles/offers-by-bidder/${wallet.address}`,
      );
      const data = await res.json();
      if (data.ok && Array.isArray(data.offers)) {
        const mapped: MyOfferTile[] = data.offers.map((o: any) => {
          const lat = parseFloat(o.lat);
          const lng = parseFloat(o.lng);
          const createdAt = o.offerCreatedAt
            ? new Date(o.offerCreatedAt)
            : new Date();
          return {
            tileId: o.tileId,
            assetId: o.assetId,
            offerId: o.offerId,
            name: `BLT ${lat.toFixed(3)},${lng.toFixed(3)}`,
            location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            coordinates: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
            rarity: (o.rarity as MyOfferTile["rarity"]) || "Common",
            imageUrl: buildStaticMapUrl(lng, lat),
            offerPriceSol: lamportsToSol(Number(o.offerPriceLamports)),
            offerStatus: (o.offerStatus as MyOfferTile["offerStatus"]) ?? "pending",
            offerDate: createdAt.toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            }),
            tileStatus: o.tileStatus,
            seller: o.seller,
            sellerUsername: o.sellerUsername,
            rawLat: lat,
            rawLng: lng,
          };
        });

        // Enrich place names via Mapbox reverse geocoding (like loadTiles).
        const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        const enriched = await Promise.all(
          mapped.map(async (tile) => {
            try {
              const geoRes = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${tile.rawLng},${tile.rawLat}.json?access_token=${token}&country=us&limit=1`,
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
            } catch {
              return tile;
            }
          }),
        );
        setMyOffers(enriched);
      } else {
        setMyOffers([]);
      }
    } catch (err) {
      console.error("Failed to load my offers:", err);
      setMyOffers([]);
    } finally {
      setLoadingMyOffers(false);
    }
  }, [wallet?.address]);

  // Decline (cancel) one of the user's own offers — refunds their escrowed SOL.
  const handleCancelMyOffer = async (tile: MyOfferTile) => {
    if (cancellingOfferId) return;
    setCancellingOfferId(tile.offerId);
    try {
      const BACKEND_URL =
        process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
      const res = await fetch(
        `${BACKEND_URL}/api/tiles/${tile.tileId}/offers/${tile.offerId}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bidder: wallet?.address }),
        },
      );
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || "Failed to cancel offer");
      }
      // Remove the cancelled offer from the list.
      setMyOffers((curr) => curr.filter((o) => o.offerId !== tile.offerId));
    } catch (err) {
      console.error("Cancel my offer failed:", err);
      alert(
        err instanceof Error ? err.message : "Failed to cancel offer",
      );
    } finally {
      setCancellingOfferId(null);
    }
  };

  // Load "My Offers" only when that tab is active.
  React.useEffect(() => {
    if (activeTab === "myoffers" && wallet?.address) {
      loadMyOffers();
    }
  }, [activeTab, wallet?.address, loadMyOffers]);

  const handleSellTile = (tile: OwnedTile) => {
    setSellingTile(tile);
    setSellPriceInput("");
    setSellStatus("idle");
    setSellError(null);
  };

  // Redirect to Wallet Connect View if wallet is not connected
  if (!wallet) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 font-sans">
        <div className="flex flex-col items-center text-center space-y-4 max-w-sm px-6">
          <User className="h-16 w-16 text-zinc-700" />
          <h1 className="text-3xl font-extrabold tracking-tight">
            Connect Your Wallet
          </h1>
          <p className="text-zinc-550 text-sm leading-relaxed">
            Please connect your Solana wallet to view and manage your coordinate
            units.
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
                  <User className="h-10 w-10 text-zinc-500 text-sm" />
                )}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-zinc-955 ${wallet ? "bg-emerald-500" : "bg-zinc-500"}`}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-white">
                  {profileData?.username || "Coordinate Owner"}
                </h1>
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
                    className="text-zinc-500 text-sm hover:text-white transition-colors cursor-pointer"
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
              <Button asChild>
                <a
                  href={`https://solscan.io/account/${wallet.address}${SOLSCAN_CLUSTER_PARAM}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Solscan <RiArrowRightUpLine className="h-3.5 w-3.5" />
                </a>
              </Button>
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
              {totalTilesCount} Units
            </div>
          </div>
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 space-y-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-mono">
              Blockland Balance
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
            <div className="text-3xl font-extrabold font-mono">
              {solBalance !== null
                ? `${solBalance.toFixed(4)} SOL`
                : "Loading..."}
            </div>
          </div>
        </div>

        {/* Owned Tiles Inventory Section */}
        <div className="space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as any)}
            className="w-full"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
              <div className="flex flex-wrap items-center gap-6">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <Grid className="h-5 w-5 text-primary" /> Owned Coordinate
                  Units
                </h2>
                <TabsList className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl h-10">
                  <TabsTrigger
                    value="all"
                    className="rounded-lg text-xs font-semibold px-4 py-1.5 text-zinc-400 data-[state=active]:bg-primary data-[state=active]:text-black transition-all cursor-pointer"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="listed"
                    className="rounded-lg text-xs font-semibold px-4 py-1.5 text-zinc-400 data-[state=active]:bg-primary data-[state=active]:text-black transition-all cursor-pointer"
                  >
                    Listed for Sale
                  </TabsTrigger>
                  <TabsTrigger
                    value="myoffers"
                    className="rounded-lg text-xs font-semibold px-4 py-1.5 text-zinc-400 data-[state=active]:bg-primary data-[state=active]:text-black transition-all cursor-pointer"
                  >
                    My Offers
                  </TabsTrigger>
                </TabsList>
              </div>

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
                      className="text-zinc-500 text-sm hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <span className="text-xs text-zinc-550 font-mono shrink-0">
                  Showing {paginatedTiles.length} of {totalTilesCount} units
                </span>
              </div>
            </div>

            <TabsContent
              value="all"
              className="mt-6 border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                  <p className="text-sm">Loading your tiles from Solana...</p>
                </div>
              ) : totalTilesCount === 0 ? (
                searchQuery.trim() ? (
                  <div className="text-center py-20 text-zinc-500 border border-dashed border-zinc-850 rounded-2xl">
                    No matching tiles found for "{searchQuery}".
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-2xl">
                    <Grid className="h-10 w-10 mb-4 text-zinc-700" />
                    <p className="text-sm">You don't own any tiles yet.</p>
                    <Link
                      href="/landmark"
                      className="mt-4 text-primary text-sm font-semibold hover:underline"
                    >
                      Explore the map →
                    </Link>
                  </div>
                )
              ) : (
                <>
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
                          <div className="absolute inset-0 bg-linear-to-t from-zinc-955 to-transparent opacity-60" />
                          <span
                            className={`absolute top-4 left-4 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border backdrop-blur-md ${getRarityBadgeColor(tile.rarity)}`}
                          >
                            {tile.rarity}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                          <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-white group-hover:text-primary transition-colors">
                              {tile.name}
                            </h3>
                            <p className="text-sm text-zinc-400 flex items-center gap-1.5 truncate">
                              {tile.location}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-zinc-500 text-[10px]">
                              TILE ID
                            </span>
                            <h4
                              className="truncate text-white text-normal font-mono"
                              title={tile.id}
                            >
                              {tile.coordinates}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
                            <div className="space-y-0.5">
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                                Buy Price
                              </div>
                              <div className="text-base font-mono">
                                {tile.purchasePrice.toFixed(5)} SOL
                              </div>
                            </div>

                            <div className="text-right space-y-0.5">
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                                Acquired
                              </div>
                              <div className="text-xs">
                                {tile.purchasedDate}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 w-full pt-2">
                            <button
                              onClick={() => handleShowDetail(tile)}
                              className="flex-1 flex items-center justify-center gap-1.5 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 py-2.5 rounded-xl transition-all cursor-pointer font-semibold text-xs"
                            >
                              Detail
                            </button>
                            <button
                              onClick={() => handleSellTile(tile)}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/95 text-black py-2.5 rounded-xl transition-all cursor-pointer font-semibold text-xs"
                            >
                              Sell
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Pagination controls below the grid */}
                  {totalPages > 1 && (
                    <div className="pt-8 border-t border-zinc-900">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <button
                              onClick={() =>
                                setCurrentPage((prev) => Math.max(1, prev - 1))
                              }
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
                              onClick={() =>
                                setCurrentPage((prev) =>
                                  Math.min(totalPages, prev + 1),
                                )
                              }
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
            </TabsContent>

            <TabsContent
              value="listed"
              className="mt-6 border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                  <p className="text-sm">Loading listed tiles...</p>
                </div>
              ) : totalTilesCount === 0 ? (
                searchQuery.trim() ? (
                  <div className="text-center py-20 text-zinc-500 border border-dashed border-zinc-850 rounded-2xl">
                    No matching listed tiles found for "{searchQuery}".
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-2xl">
                    <Tag className="h-10 w-10 mb-4 text-zinc-700" />
                    <p className="text-sm">
                      You haven't listed any tiles for sale yet.
                    </p>
                  </div>
                )
              ) : (
                <>
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
                          <div className="absolute inset-0 bg-linear-to-t from-zinc-955 to-transparent opacity-60" />
                          <span
                            className={`absolute top-4 left-4 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border backdrop-blur-md ${getRarityBadgeColor(tile.rarity)}`}
                          >
                            {tile.rarity}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                          <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-white group-hover:text-primary transition-colors">
                              {tile.name}
                            </h3>
                            <p className="text-sm text-zinc-400 flex items-center gap-1.5 truncate">
                              {tile.location}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-zinc-500 text-[10px]">
                              TILE ID
                            </span>
                            <h4
                              className="truncate text-white text-normal font-mono"
                              title={tile.id}
                            >
                              {tile.coordinates}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
                            <div className="space-y-0.5">
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                                Sell Price
                              </div>
                              <div className="text-base font-mono text-primary font-semibold">
                                {tile.purchasePrice.toFixed(5)} SOL
                              </div>
                            </div>

                            <div className="text-right space-y-0.5">
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                                Listed Date
                              </div>
                              <div className="text-xs">
                                {tile.purchasedDate}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 w-full pt-2">
                            <Button
                              onClick={() => handleShowDetail(tile)}
                              variant={"outline"}
                            >
                              Detail
                            </Button>
                            <Button onClick={() => handleShowOffers(tile)}>
                              Offers{" "}
                              {tile.offersCount !== undefined &&
                                tile.offersCount > 0 &&
                                `(${tile.offersCount})`}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Pagination controls below the grid */}
                  {totalPages > 1 && (
                    <div className="pt-8 border-t border-zinc-900">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <button
                              onClick={() =>
                                setCurrentPage((prev) => Math.max(1, prev - 1))
                              }
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
                              onClick={() =>
                                setCurrentPage((prev) =>
                                  Math.min(totalPages, prev + 1),
                                )
                              }
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
            </TabsContent>

            {/* My Offers Tab */}
            <TabsContent
              value="myoffers"
              className="mt-6 border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              {loadingMyOffers ? (
                <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                  <p className="text-sm">Loading your offers...</p>
                </div>
              ) : myOffers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-2xl">
                  <Tag className="h-10 w-10 mb-4 text-zinc-700" />
                  <p className="text-sm">
                    You haven&apos;t made any offers yet.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {myOffers.map((tile) => {
                    const isPending = tile.offerStatus === "pending";
                    const isCancelling = cancellingOfferId === tile.offerId;
                    return (
                      <div
                        key={tile.offerId}
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
                              <span
                                className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${getRarityBadgeColor(
                                  tile.rarity,
                                )}`}
                              >
                                {tile.rarity}
                              </span>
                              <span className="text-[11px] text-zinc-555 font-mono flex items-center gap-1">
                                <Grid className="h-3 w-3" />
                                {tile.coordinates}
                              </span>
                              <span className="text-[10px] text-zinc-555 font-mono">
                                • {tile.offerDate}
                              </span>
                            </div>
                            <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                              {tile.name}
                            </h3>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                              <p className="text-xs text-zinc-400 flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-zinc-550" />
                                {tile.location}
                              </p>
                              <span className="text-xs text-zinc-500">
                                Seller:{" "}
                                <span className="font-mono text-zinc-400">
                                  {tile.seller
                                    ? `${tile.seller.slice(0, 6)}...${tile.seller.slice(-4)}`
                                    : "—"}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between md:justify-end gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-zinc-900">
                          <div className="text-left md:text-right space-y-1">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wide font-mono">
                              Your Offer
                            </div>
                            <div className="text-lg font-semibold text-primary font-mono">
                              {tile.offerPriceSol.toFixed(5)} SOL
                            </div>
                            <span
                              className={`inline-block text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded border ${
                                tile.offerStatus === "accepted"
                                  ? "border-emerald-700/60 text-emerald-400"
                                  : tile.offerStatus === "declined" ||
                                      tile.offerStatus === "cancelled"
                                    ? "border-zinc-700 text-zinc-500"
                                    : "border-amber-700/60 text-amber-400"
                              }`}
                            >
                              {tile.offerStatus}
                            </span>
                          </div>
                          {isPending ? (
                            <Button
                              disabled={isCancelling}
                              onClick={() => handleCancelMyOffer(tile)}
                              className="gap-1.5"
                            >
                              {isCancelling && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              )}
                              Decline
                            </Button>
                          ) : (
                            <Button disabled variant={"outline"}>
                              {tile.offerStatus}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Local Tile Details Dialog */}
      <Dialog
        open={selectedDetailTile !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDetailTile(null);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-white">Tile Details</DialogTitle>
          </DialogHeader>

          {selectedDetailTile && (
            <ScrollArea className="max-h-[80vh] pr-4">
              <div className="space-y-6 mt-4">
                <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-zinc-800">
                  <img
                    src={selectedDetailTile.imageUrl}
                    alt={selectedDetailTile.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-zinc-955 to-transparent opacity-60" />
                  <span
                    className={`absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border backdrop-blur-md ${getRarityBadgeColor(selectedDetailTile.rarity)}`}
                  >
                    {selectedDetailTile.rarity}
                  </span>
                  {/* <div className="absolute bottom-3 left-3 flex gap-1 items-center text-xs font-mono">
                    <Grid className="h-3.5 w-3.5 text-primary" />
                    <span>{selectedDetailTile.coordinates}</span>
                  </div> */}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {selectedDetailTile.name}
                    </h3>
                    <p className="text-sm text-zinc-400 flex items-center gap-1 mt-1">
                      <MapPin className="h-4 w-4 text-zinc-550 shrink-0" />
                      {selectedDetailTile.location}
                    </p>
                  </div>

                  <div className="h-px bg-zinc-800/80" />

                  <div className="flex flex-col gap-4 text-sm divide-y">
                    <div className="space-y-1 pb-4">
                      <span className="text-zinc-500 text-[10px]">TILE ID</span>
                      <h4
                        className="truncate text-white text-normal font-mono"
                        title={selectedDetailTile.id}
                      >
                        {/* {selectedDetailTile.id} */}
                        {selectedDetailTile.coordinates}
                      </h4>
                    </div>
                    <div className="space-y-1 pb-4">
                      <span className="text-zinc-500 text-[10px]">
                        PURCHASE PRICE
                      </span>
                      <h4 className="text-white font-mono">
                        {selectedDetailTile.purchasePrice.toFixed(5)} SOL
                      </h4>
                    </div>
                    <div className="space-y-1">
                      <span className="text-zinc-500 text-[10px]">
                        ACQUIRED DATE
                      </span>
                      <h4 className="text-white">
                        {selectedDetailTile.purchasedDate}
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  {selectedDetailTile.status === "listed" && (
                    <Button asChild onClick={() => setSelectedDetailTile(null)} className="flex-1">
                      <Link href={`/marketplace/${selectedDetailTile.id}`}>
                        Details
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setSelectedDetailTile(null)}
                    className={selectedDetailTile.status === "listed" ? "flex-1" : "w-full"}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Local Tile Offers Dialog */}
      <Dialog
        open={selectedOffersTile !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedOffersTile(null);
        }}
      >
        <DialogContent className="max-w-xl text-zinc-300">
          <DialogHeader>
            <DialogTitle className="text-white">Active Offers</DialogTitle>
          </DialogHeader>

          {selectedOffersTile && (
            <div className="space-y-6 mt-4">
              {/* Info Tile (Thumbnail map, Rarity badge, Lokasi) */}
              <div className="flex gap-4 items-start border-b border-zinc-800 pb-4">
                <img
                  src={selectedOffersTile.imageUrl}
                  alt={selectedOffersTile.name}
                  className="w-16 h-16 object-cover rounded-lg border border-zinc-800 shrink-0"
                />
                <div className="space-y-0.5">
                  <span
                    className={`text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded border ${getRarityBadgeColor(selectedOffersTile.rarity)}`}
                  >
                    {selectedOffersTile.rarity}
                  </span>
                  <h4 className="font-semibold text-white mt-1">
                    {selectedOffersTile.name}
                  </h4>
                  <p className="text-xs text-zinc-400 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />{" "}
                    {selectedOffersTile.location}
                  </p>
                </div>
              </div>

              {/* Daftar Penawaran Aktif */}
              <ScrollArea className="max-h-[300px] pr-2">
                {loadingOffers ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : tileOffers.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-sm">
                    No active offers on this tile.
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {tileOffers.map((off) => {
                      const offerStatus: string = off.status ?? "pending";
                      const isPending = offerStatus === "pending";
                      const isUpdating = updatingOfferId === off.id;
                      return (
                        <AccordionItem
                          key={off.id}
                          value={off.id}
                          className="bg-black/45 border border-zinc-900 rounded-xl px-3 mb-3"
                        >
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center justify-between gap-2.5 w-full pr-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full overflow-hidden border border-zinc-800 shrink-0">
                                  {off.bidderPhotoUrl ? (
                                    <img
                                      src={off.bidderPhotoUrl}
                                      alt={off.bidderUsername}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Avatar
                                      colors={[
                                        "#f5e1a4",
                                        "#d9d593",
                                        "#ee7f27",
                                        "#bc162a",
                                        "#302325",
                                      ]}
                                      variant="pixel"
                                      size={28}
                                    />
                                  )}
                                </div>
                                <div className="min-w-0 text-left">
                                  <p className="text-xs font-semibold text-zinc-300 truncate">
                                    {off.bidderUsername ||
                                      `${off.bidder.slice(0, 6)}...${off.bidder.slice(-4)}`}
                                  </p>
                                  <span className="text-[9px] text-zinc-500 font-mono">
                                    {new Date(off.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded border ${
                                    offerStatus === "accepted"
                                      ? "border-emerald-700/60 text-emerald-400"
                                      : offerStatus === "declined"
                                        ? "border-zinc-700 text-zinc-500"
                                        : "border-amber-700/60 text-amber-400"
                                  }`}
                                >
                                  {offerStatus}
                                </span>
                                <span className="text-xs font-semibold text-primary font-mono">
                                  {lamportsToSol(
                                    Number(off.priceLamports),
                                  ).toFixed(5)}{" "}
                                  SOL
                                </span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            {isPending ? (
                              <div className="flex items-center gap-2 pt-2">
                                <ButtonCustom
                                  disabled={isUpdating}
                                  onClick={() =>
                                    handleUpdateOfferStatus(off.id, "accepted")
                                  }
                                  className="flex-1 justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  Approve
                                </ButtonCustom>
                                <Button
                                  disabled={isUpdating}
                                  variant="outline"
                                  onClick={() =>
                                    handleUpdateOfferStatus(off.id, "declined")
                                  }
                                  className="flex-1 justify-center gap-1.5"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <X className="h-3.5 w-3.5" />
                                  )}
                                  Decline
                                </Button>
                              </div>
                            ) : (
                              <p className="text-[11px] text-zinc-500 pt-2">
                                This offer has been{" "}
                                <span className="font-semibold">
                                  {offerStatus}
                                </span>
                                .
                              </p>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </ScrollArea>

              <div className="flex gap-3">
                <ButtonCustom
                  onClick={() => setSelectedOffersTile(null)}
                  className="w-full justify-center"
                >
                  Close
                </ButtonCustom>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Local Sell Tile Dialog */}
      <Dialog
        open={sellingTile !== null}
        onOpenChange={(open) => {
          if (!open) setSellingTile(null);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {sellStatus === "idle" && "List Tile for Sale"}
              {sellStatus === "confirm" && "Confirm Listing"}
              {sellStatus === "success" && "Listing Successful"}
            </DialogTitle>
          </DialogHeader>

          {sellingTile && (
            <div className="space-y-6 mt-4">
              {/* Common Header Info */}
              <div className="flex gap-4 items-start border-b border-zinc-800 pb-4">
                <img
                  src={sellingTile.imageUrl}
                  alt={sellingTile.name}
                  className="w-16 h-16 object-cover rounded-lg border border-zinc-800 shrink-0"
                />
                <div className="space-y-0.5">
                  <span
                    className={`text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded border ${getRarityBadgeColor(sellingTile.rarity)}`}
                  >
                    {sellingTile.rarity}
                  </span>
                  <h4 className="font-semibold text-white mt-1">
                    {sellingTile.name}
                  </h4>
                  <p className="text-xs text-zinc-400 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {sellingTile.location}
                  </p>
                </div>
              </div>

              {/* State: IDLE (Form Input) */}
              {sellStatus === "idle" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (sellPriceInput && parseFloat(sellPriceInput) > 0) {
                      setSellStatus("confirm");
                    }
                  }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <div>
                      <Label>Set Listing Price</Label>
                    </div>
                    <div className="relative bg-black flex gap-2 h-[48px] items-center px-4 rounded-xl border border-zinc-800 focus-within:border-zinc-700">
                      <NumericFormat
                        customInput={Input}
                        allowNegative={false}
                        decimalScale={5}
                        placeholder="e.g. 0.05"
                        value={sellPriceInput}
                        onValueChange={(values) => {
                          setSellPriceInput(values.value);
                        }}
                        className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none p-0 text-[15px] font-normal text-white placeholder-zinc-650"
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
                      onClick={() => setSellingTile(null)}
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
                </form>
              )}

              {/* State: CONFIRM */}
              {sellStatus === "confirm" && (
                <div className="space-y-6">
                  {sellError && (
                    <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-lg font-mono">
                      {sellError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Listing Price</span>
                      <span className="font-semibold text-primary">
                        {sellPriceInput} SOL
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
                      disabled={sellLoading}
                      onClick={() => setSellStatus("idle")}
                      className="flex-1 border border-zinc-800 hover:bg-zinc-900 font-semibold py-3 rounded-xl transition-all cursor-pointer text-sm disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={sellLoading}
                      onClick={async () => {
                        setSellLoading(true);
                        setSellError(null);
                        try {
                          const BACKEND_URL =
                            process.env.NEXT_PUBLIC_BACKEND_URL ??
                            "http://localhost:3001";

                          // 1. Ask the backend to build the custody transfer tx.
                          const prepareRes = await fetch(
                            `${BACKEND_URL}/api/tiles/list`,
                            {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                assetId: sellingTile.id,
                                priceSol: parseFloat(sellPriceInput),
                                seller: wallet.address,
                              }),
                            },
                          );
                          const prepareData = await prepareRes.json();
                          if (!prepareData.ok) {
                            throw new Error(
                              prepareData.error || "Failed to list tile",
                            );
                          }

                          // 2. Seller signs + submits the custody transfer.
                          const signature = await signAndSendBase64Tx(
                            prepareData.tx,
                            wallet,
                          );

                          // 3. Confirm the listing with the on-chain signature.
                          const confirmRes = await fetch(
                            `${BACKEND_URL}/api/tiles/list/confirm`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                assetId: sellingTile.id,
                                priceSol: parseFloat(sellPriceInput),
                                seller: wallet.address,
                                signature,
                              }),
                            },
                          );
                          const confirmData = await confirmRes.json();
                          if (confirmData.ok) {
                            setSellStatus("success");
                            // Reload owned tiles on account page
                            loadTiles(
                              currentPage,
                              debouncedSearchQuery,
                              activeTab,
                            );
                          } else {
                            setSellError(
                              confirmData.error || "Failed to confirm listing",
                            );
                          }
                        } catch (err) {
                          console.error("Listing tile error:", err);
                          setSellError(
                            err instanceof Error
                              ? err.message
                              : "Network connection error",
                          );
                        } finally {
                          setSellLoading(false);
                        }
                      }}
                      className="flex-1 bg-primary hover:bg-primary/95 text-black font-semibold py-3 rounded-xl transition-all cursor-pointer text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {sellLoading && (
                        <Loader2 className="h-4 w-full animate-spin text-black" />
                      )}
                      {!sellLoading && "Confirm Listing"}
                    </button>
                  </div>
                </div>
              )}

              {/* State: SUCCESS */}
              {sellStatus === "success" && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-xl border border-emerald-500/20">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-lg">
                      Tile Listed!
                    </h4>
                    <p className="text-sm text-zinc-400 mt-1">
                      <strong>{sellingTile.name}</strong> is now listed for sale
                      at <strong>{sellPriceInput} SOL</strong>.
                    </p>
                  </div>
                  <div className="text-xs font-mono bg-black p-3 rounded-lg border border-zinc-800 text-zinc-550 text-left overflow-x-auto">
                    Tx: 7s9aK...e98v1u
                  </div>
                  <ButtonCustom
                    onClick={() => setSellingTile(null)}
                    className="w-full justify-center"
                  >
                    Done
                  </ButtonCustom>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
