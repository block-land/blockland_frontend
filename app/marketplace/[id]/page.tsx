"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Grid, Calendar, User, ShieldCheck, Share2, DollarSign, MessageSquare, Tag, Loader2 } from "lucide-react";
import { withCustomButton } from "@/components/custom/button_custom";
import ChatSellerWidget from "@/components/chat-seller-widget";
import { getRarityBadgeColor } from "@/lib/tiles";
import { ScrollArea } from "@/components/ui/scroll-area";
import { lamportsToSol } from "@/lib/solana/mint";
import Avatar from "boring-avatars";
import { useWallets } from "@privy-io/react-auth/solana";
import { escrowSol } from "@/lib/solana/signing";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RiArrowLeftSFill } from "react-icons/ri";
import { BACKEND_URL } from "@/lib/api";

const ButtonCustom = withCustomButton("button");

export interface TileItemDetail {
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

export default function TileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { wallets } = useWallets();
  const wallet = wallets[0];

  // Local Modal States
  const [activeModal, setActiveModal] = React.useState<"buy" | "buy-success" | "offer" | "offer-success" | null>(null);

  const tileId = params?.id as string;
  
  const [tile, setTile] = React.useState<TileItemDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [offerPrice, setOfferPrice] = React.useState("");
  const [errorType, setErrorType] = React.useState<"not_found" | "not_listed" | null>(null);

  // Buy-now flow state
  const [buying, setBuying] = React.useState(false);
  const [buyTxSignature, setBuyTxSignature] = React.useState<string>("");
  const [buyError, setBuyError] = React.useState<string | null>(null);

  // Offer List States
  const [offers, setOffers] = React.useState<Array<{ id: string; bidder: string; price: number; date: string; avatar: string; rawBidder: string; status: string }>>([]);

  // Fetch tile detail from database on mount
  React.useEffect(() => {
    const fetchTileDetail = async () => {
      setLoading(true);
      setErrorType(null);
      try {
        const res = await fetch(`${BACKEND_URL}/api/tiles/${tileId}`);
        const data = await res.json();
        
        if (data.ok && data.tile) {
          const t = data.tile;

          // VALIDATION: If the tile is not listed for sale in the marketplace, prevent view
          if (t.status !== "listed") {
            setErrorType("not_listed");
            setTile(null);
            setLoading(false);
            return;
          }

          const lat = parseFloat(t.lat);
          const lng = parseFloat(t.lng);
          const lamports = t.listingPriceLamports ? Number(t.listingPriceLamports) : 0;
          const createdAt = t.listedAt ? new Date(t.listedAt) : new Date();

          const mapped: TileItemDetail = {
            id: t.id,
            assetId: t.assetId,
            h3Cell: t.h3Cell,
            name: `BLT ${lat.toFixed(3)},${lng.toFixed(3)}`,
            location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            coordinates: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
            rarity: (t.rarity as TileItemDetail["rarity"]) || "Common",
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

          // Reverse geocode via Mapbox Places
          const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
          try {
            const geoRes = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&country=us&limit=1`
            );
            const geoData = await geoRes.json();
            const placeName = geoData.features?.[0]?.place_name;
            if (placeName) {
              mapped.location = placeName;
              mapped.name = placeName.split(",")[0];
            }
          } catch (err) {
            console.error("Geocoding failed for tile detail page:", err);
          }

          setTile(mapped);
          
          // Fetch real offers from database
          fetchOffers();
        } else {
          setErrorType("not_found");
        }
      } catch (err) {
        console.error("Failed to load tile detail:", err);
        setErrorType("not_found");
      } finally {
        setLoading(false);
      }
    };

    const fetchOffers = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/tiles/${tileId}/offers`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.offers)) {
          const mappedOffers = data.offers.map((off: any) => {
            const createdAt = new Date(off.createdAt);
            const diffTime = Math.abs(new Date().getTime() - createdAt.getTime());
            const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
            const timeLabel = diffHours === 1 ? "1 hour ago" : diffHours < 24 ? `${diffHours} hours ago` : `${Math.floor(diffHours/24)} days ago`;

            return {
              id: off.id,
              bidder: off.bidderUsername || `${off.bidder.slice(0, 6)}...${off.bidder.slice(-4)}`,
              price: lamportsToSol(Number(off.priceLamports)),
              date: timeLabel,
              avatar: off.bidderPhotoUrl || "",
              rawBidder: off.bidder,
              status: off.status ?? "pending",
            };
          });
          setOffers(mappedOffers);
        }
      } catch (err) {
        console.error("Failed to fetch offers:", err);
      }
    };

    if (tileId) {
      fetchTileDetail();
    }
  }, [tileId]);

  // Current connected wallet (for the "this is your tile" guard on Chat Seller).
  const [currentWallet, setCurrentWallet] = React.useState<string | null>(null);
  React.useEffect(() => {
    setCurrentWallet(window.localStorage.getItem("privy:walletAddress"));
  }, []);

  // Chat Seller floating widget.
  const [isChatOpen, setIsChatOpen] = React.useState(false);

  const isOwnTile = !!tile && !!currentWallet && tile.publisher.walletAddress === currentWallet;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-zinc-500 font-sans text-sm">Loading coordinate unit details...</p>
      </div>
    );
  }

  if (errorType === "not_listed") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl ">Tile Not for Sale</h2>
        <p className="text-zinc-500">This coordinate unit is not currently listed for sale in the marketplace.</p>
        <Link href="/marketplace" className="text-primary hover:underline">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  if (errorType === "not_found" || !tile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl ">Tile Not Found</h2>
        <p className="text-zinc-500">The coordinate unit you are looking for does not exist or has been removed.</p>
        <Link href="/marketplace" className="text-primary hover:underline">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const handleBuy = () => {
    setActiveModal("buy");
  };

  // Whether the connected wallet already has a pending offer on this tile.
  // A bidder may only have one pending offer at a time; after cancel/decline
  // they may offer again.
  const userPendingOffer = wallet
    ? offers.find(
        (off) => off.rawBidder === wallet.address && off.status === "pending",
      )
    : undefined;
  const userOwnsTile = !!tile && wallet?.address === tile.publisher.walletAddress;
  const isOfferFormDisabled = userOwnsTile || Boolean(userPendingOffer);

  const handleMakeOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOfferFormDisabled || !offerPrice || parseFloat(offerPrice) <= 0) {
      return;
    }
    setActiveModal("offer");
  };

  return (
    <div className="min-h-screen bg-black text-white pt-16 md:pt-32 pb-24 font-sans">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-[68px] space-y-8">
        
        {/* Back Link */}
        <div>
          <Link
            href="/marketplace"
            className="text-sm text-primary"
          >
            Back to Marketplace
          </Link>
        </div>

        {/* Detailed Container grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Visuals & Technical details */}
          <div className="lg:col-span-7 space-y-8">
            <div className="relative aspect-video w-full rounded-3xl overflow-hidden border border-zinc-900 group">
              <img
                src={tile.imageUrl}
                alt={tile.name}
                className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-4 items-center justify-between">
                <span className={`text-xs  uppercase tracking-wider px-3 py-1 rounded border backdrop-blur-md ${getRarityBadgeColor(tile.rarity)}`}>
                  {tile.rarity}
                </span>
                <div className="flex gap-2 text-sm text-white font-mono backdrop-blur-md px-3 py-1.5 rounded border border-zinc-800">
                  <Grid className="h-4 w-4 text-primary shrink-0" />
                  <span>{tile.coordinates}</span>
                </div>
              </div>
            </div>

            {/* Publisher Block info */}
            <div className="space-y-4">
              <h4 className="text-xs text-zinc-500 uppercase tracking-wider font-mono">Listed Publisher</h4>
              <div className="flex items-center justify-between p-4 bg-black/40 border border-zinc-900 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-800 shrink-0">
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
                        size={40}
                      />
                    )}
                  </div>
                  <div>
                    <h5 className=" text-white text-sm flex items-center gap-1">
                      {tile.publisher.name}
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                    </h5>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{tile.publisher.walletAddress ? `${tile.publisher.walletAddress.slice(0, 6)}...${tile.publisher.walletAddress.slice(-6)}` : ""}</p>
                  </div>
                </div>
                <div className="text-right space-y-1 font-mono text-[11px] text-zinc-500">
                  <div className="flex items-center gap-1 justify-end">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Listed</span>
                  </div>
                  <span className="text-zinc-400 ">{tile.date}</span>
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 sm:p-8 space-y-6">
              <h3 className="text-xl  text-white border-b border-zinc-900 pb-4">
                Technical Data Specs
              </h3>
              <div className="flex flex-col gap-6 text-sm">
                <div className="space-y-1">
                  <span className="text-zinc-500 font-mono">TILE ID</span>
                  <p className="text-zinc-200 font-mono  truncate" title={tile.id}>{tile.id}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-zinc-500 font-mono">COORDINATES</span>
                  <p className="text-zinc-200 font-mono ">{tile.coordinates}</p>
                </div>
              </div>
            </div>

           

          </div>

          {/* Right Column: Financial detail & Action box */}
          <div className="lg:col-span-5 bg-zinc-950 border border-zinc-900 rounded-3xl p-6 sm:p-8 space-y-8 sticky top-28">
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl tracking-tight text-white">
                {tile.name}
              </h2>
              <p className="text-sm text-zinc-400 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-zinc-550 shrink-0" />
                {tile.location}
              </p>
            </div>

            {/* Price Box */}
            <div className="bg-black/60 border border-zinc-900 rounded-2xl p-5 space-y-2">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-mono">Current Price</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl text-primary font-mono">{tile.price.toFixed(5)}</span>
                <span className="text-lg  text-zinc-300 font-mono">SOL</span>
              </div>
            </div>

            {/* Offering Input Block */}
            <form onSubmit={handleMakeOffer} className="space-y-3 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-900">
              <h4 className="text-xs text-zinc-400 uppercase tracking-wider font-mono">Make an Offer</h4>
              {userPendingOffer && (
                <p className="text-xs text-zinc-500 py-2">
                  You have an active offer on this tile. Cancel it to make a new one.
                </p>
              )}
              <div className="flex gap-2">
                <div className="relative flex-1 bg-black flex gap-2 h-[48px] items-center px-4 rounded-xl border border-zinc-800 focus-within:border-zinc-700 has-[:disabled]:opacity-50">
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Offering price in SOL"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    disabled={isOfferFormDisabled}
                    className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none p-0 text-[15px] font-normal text-white placeholder-zinc-650 disabled:cursor-not-allowed"
                    required
                  />
                  <span className="text-xs font-mono text-zinc-500 shrink-0 select-none">SOL</span>
                </div>
                <button
                  type="submit"
                  disabled={isOfferFormDisabled}
                  className="bg-transparent hover:bg-zinc-800 border border-zinc-800 text-white px-4 rounded-xl transition-all cursor-pointer text-sm shrink-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Offer
                </button>
              </div>
            </form>

            {/* Offer List Block using ScrollArea */}
            <div className="space-y-3 bg-zinc-900/20 p-5 rounded-2xl border border-zinc-900">
              <h4 className="text-xs text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" /> Active Offers ({offers.length})
              </h4>
              <ScrollArea className="h-[135px] pr-2">
                <div className="space-y-3">
                  {offers.sort((a, b) => b.price - a.price).map((off) => (
                    <div key={off.id} className="flex items-center justify-between p-3 bg-black/45 border border-zinc-900 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full overflow-hidden border border-zinc-800 shrink-0">
                          {off.avatar ? (
                            <img
                              src={off.avatar}
                              alt={off.bidder}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Avatar
                              colors={["#f5e1a4", "#d9d593", "#ee7f27", "#bc162a", "#302325"]}
                              variant="pixel"
                              size={28}
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-xs  text-zinc-300">{off.bidder}</p>
                          <span className="text-[9px] text-zinc-550 font-mono">{off.date}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs  text-primary font-mono">{off.price.toFixed(5)} SOL</span>
                        <p className="text-[8px] text-emerald-500 font-mono">Pending</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Action buttons */}
            <div className="space-y-4 pt-4 border-t border-zinc-900">
              <ButtonCustom onClick={handleBuy} className="w-full justify-center py-4 text-base ">
                Buy Coordinate Unit
              </ButtonCustom>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    if (!tile || isOwnTile) return;
                    setIsChatOpen(true);
                  }}
                  disabled={isOwnTile}
                  className="flex-1 flex items-center justify-center gap-2 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 py-3 rounded-xl transition-all cursor-pointer  text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <MessageSquare className="h-4 w-4" /> {isOwnTile ? "Your Tile" : "Chat Seller"}
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 py-3 rounded-xl transition-all cursor-pointer  text-sm">
                  <Share2 className="h-4 w-4" /> Share
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Local Buy Coordinate Dialog */}
      <Dialog
        open={activeModal === "buy" || activeModal === "buy-success"}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      >
        <DialogContent className="max-w-xl text-zinc-300">
          <DialogHeader>
            <DialogTitle className="text-white ">
              {activeModal === "buy" ? "Confirm Purchase" : "Transaction Success"}
            </DialogTitle>
          </DialogHeader>

          {activeModal === "buy" && (
            <div className="space-y-6 mt-4">
              <div className="flex gap-4 items-start border-b border-zinc-800 pb-4">
                <img
                  src={tile.imageUrl}
                  alt={tile.name}
                  className="w-20 h-20 object-cover rounded-lg border border-zinc-800 shrink-0"
                />
                <div className="space-y-1">
                  <span className={`text-[10px] uppercase  tracking-wider px-2 py-0.5 rounded border ${getRarityBadgeColor(tile.rarity)}`}>
                    {tile.rarity}
                  </span>
                  <h4 className=" text-white mt-1">{tile.name}</h4>
                  <p className="text-xs text-zinc-400 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {tile.location}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Price</span>
                  <span className=" text-primary">{tile.price.toFixed(5)} SOL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Transaction Fee</span>
                  <span className="text-zinc-500">0.00005 SOL</span>
                </div>
                <div className="border-t border-zinc-800 pt-3 flex justify-between  text-white text-base">
                  <span>Total Cost</span>
                  <span className="text-primary">{(tile.price + 0.00005).toFixed(5)} SOL</span>
                </div>
              </div>

              {buyError && (
                <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-lg font-mono">
                  {buyError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={buying}
                  onClick={() => {
                    setActiveModal(null);
                    setBuyError(null);
                  }}
                  className="flex-1 border border-zinc-800 hover:bg-zinc-900  py-3 rounded-xl transition-all cursor-pointer text-sm text-center disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={buying}
                  onClick={async () => {
                    if (!wallet) {
                      setBuyError("Please connect your wallet to buy.");
                      return;
                    }
                    if (!tile) return;
                    setBuying(true);
                    setBuyError(null);
                    try {
                      // 1. Fetch the custodian (escrow) address.
                      const escrowAddrRes = await fetch(
                        `${BACKEND_URL}/api/tiles/${tileId}/escrow-address`,
                      );
                      const escrowAddrData = await escrowAddrRes.json();
                      if (!escrowAddrData.ok) {
                        throw new Error(
                          escrowAddrData.error || "Failed to prepare purchase",
                        );
                      }

                      // 2. Buyer pays the listing price into the custodian on-chain.
                      const lamports = BigInt(
                        Math.round(tile.price * LAMPORTS_PER_SOL),
                      );
                      const signature = await escrowSol(
                        escrowAddrData.escrowAddress,
                        lamports,
                        wallet,
                      );

                      // 3. Settle: backend transfers the tile + pays the seller.
                      const res = await fetch(`${BACKEND_URL}/api/tiles/${tileId}/buy`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ buyer: wallet.address, signature }),
                      });
                      const data = await res.json();
                      if (!data.ok) {
                        throw new Error(data.error || "Failed to buy tile");
                      }

                      setBuyTxSignature(signature);
                      setBuyError(null);
                      setActiveModal("buy-success");
                    } catch (err) {
                      console.error("Buy tile failed:", err);
                      const msg =
                        err instanceof Error ? err.message : "Failed to buy tile";
                      // Surface wallet rejections with a clear message instead of
                      // the raw "User rejected the request" string.
                      setBuyError(
                        /reject|denied|cancel/i.test(msg)
                          ? "Transaction was rejected in your wallet."
                          : msg,
                      );
                    } finally {
                      setBuying(false);
                    }
                  }}
                  className="flex-1 bg-primary hover:bg-primary/95 text-black  py-3 rounded-xl transition-all cursor-pointer text-sm text-center disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {buying && <Loader2 className="h-4 w-4 animate-spin text-black" />}
                  {buying ? "Processing..." : "Confirm Buy"}
                </button>
              </div>
            </div>
          )}

          {activeModal === "buy-success" && (
            <div className="text-center space-y-4 py-4 mt-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-xl border border-emerald-500/20">
                ✓
              </div>
              <div>
                <h4 className=" text-white text-lg">Tile Acquired!</h4>
                <p className="text-sm text-zinc-400 mt-1">
                  You are now the proud owner of <strong>{tile.name}</strong> coordinate unit.
                </p>
              </div>
              <div className="text-xs font-mono bg-black p-3 rounded-lg border border-zinc-800 text-zinc-500 text-left overflow-x-auto">
                Tx: {buyTxSignature.slice(0, 8)}...{buyTxSignature.slice(-8)}
              </div>
              <ButtonCustom onClick={() => setActiveModal(null)} className="w-full justify-center">
                Close
              </ButtonCustom>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Local Offer Submission Dialog */}
      <Dialog
        open={activeModal === "offer" || activeModal === "offer-success"}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      >
        <DialogContent className="max-w-xl text-zinc-300">
          <DialogHeader>
            <DialogTitle className="text-white ">
              {activeModal === "offer" ? "Confirm Offer Submission" : "Offer Submitted"}
            </DialogTitle>
          </DialogHeader>

          {activeModal === "offer" && (
            <div className="space-y-6 mt-4">
              <div className="flex gap-4 items-start border-b border-zinc-800 pb-4">
                <img
                  src={tile.imageUrl}
                  alt={tile.name}
                  className="w-20 h-20 object-cover rounded-lg border border-zinc-800 shrink-0"
                />
                <div className="space-y-1">
                  <span className={`text-[10px] uppercase  tracking-wider px-2 py-0.5 rounded border ${getRarityBadgeColor(tile.rarity)}`}>
                    {tile.rarity}
                  </span>
                  <h4 className=" text-white mt-1">{tile.name}</h4>
                  <p className="text-xs text-zinc-400 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {tile.location}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Current Price</span>
                  <span className="text-zinc-400 ">{tile.price.toFixed(5)} SOL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Your Offering Price</span>
                  <span className=" text-primary">{offerPrice} SOL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Offer Expiry</span>
                  <span className="text-zinc-400">7 Days</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 border border-zinc-800 hover:bg-zinc-900  py-3 rounded-xl transition-all cursor-pointer text-sm text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!offerPrice || parseFloat(offerPrice) <= 0) return;
                    if (!wallet) {
                      alert("Please connect your wallet to make an offer.");
                      return;
                    }
                    try {
                      // 1. Fetch the custodian (escrow) address.
                      const escrowAddrRes = await fetch(`${BACKEND_URL}/api/tiles/${tileId}/escrow-address`);
                      const escrowAddrData = await escrowAddrRes.json();
                      if (!escrowAddrData.ok) {
                        throw new Error(escrowAddrData.error || "Failed to prepare escrow");
                      }

                      // 2. Bidder locks the offer SOL into the custodian on-chain.
                      const lamports = BigInt(
                        Math.round(parseFloat(offerPrice) * LAMPORTS_PER_SOL)
                      );
                      const escrowTx = await escrowSol(
                        escrowAddrData.escrowAddress,
                        lamports,
                        wallet
                      );

                      // 3. Record the offer with the escrow signature.
                      const res = await fetch(`${BACKEND_URL}/api/tiles/${tileId}/offers`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          bidder: wallet.address,
                          priceSol: parseFloat(offerPrice),
                          escrowTx,
                        }),
                      });
                      const data = await res.json();
                      if (data.ok) {
                        setOfferPrice("");
                        setActiveModal("offer-success");

                        // Reload offers
                        const offersRes = await fetch(`${BACKEND_URL}/api/tiles/${tileId}/offers`);
                        const offersData = await offersRes.json();
                        if (offersData.ok && Array.isArray(offersData.offers)) {
                          const mappedOffers = offersData.offers.map((off: any) => {
                            const createdAt = new Date(off.createdAt);
                            const diffTime = Math.abs(new Date().getTime() - createdAt.getTime());
                            const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
                            const timeLabel = diffHours === 1 ? "1 hour ago" : diffHours < 24 ? `${diffHours} hours ago` : `${Math.floor(diffHours/24)} days ago`;

                            return {
                              id: off.id,
                              bidder: off.bidderUsername || `${off.bidder.slice(0, 6)}...${off.bidder.slice(-4)}`,
                              price: lamportsToSol(Number(off.priceLamports)),
                              date: timeLabel,
                              avatar: off.bidderPhotoUrl || "",
                              rawBidder: off.bidder,
                              status: off.status ?? "pending",
                            };
                          });
                          setOffers(mappedOffers);
                        }
                      } else {
                        alert(data.error || "Failed to submit offer");
                      }
                    } catch (err) {
                      console.error("Submit offer failed:", err);
                      alert(
                        err instanceof Error
                          ? err.message
                          : "Failed to submit offer"
                      );
                    }
                  }}
                  className="flex-1 bg-primary hover:bg-primary/95 text-black  py-3 rounded-xl transition-all cursor-pointer text-sm text-center"
                >
                  Submit Offer
                </button>
              </div>
            </div>
          )}

          {activeModal === "offer-success" && (
            <div className="text-center space-y-4 py-4 mt-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl border border-primary/20">
                ✓
              </div>
              <div>
                <h4 className=" text-white text-lg">Offer Submitted Successfully!</h4>
                <p className="text-sm text-zinc-400 mt-1">
                  Your offer has been submitted to the publisher.
                </p>
              </div>
              <ButtonCustom onClick={() => setActiveModal(null)} className="w-full justify-center">
                Close
              </ButtonCustom>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Seller floating widget (realtime, via Redis + BullMQ + SSE) */}
      {tile && (
        <ChatSellerWidget
          open={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          sellerWallet={tile.publisher.walletAddress}
          sellerName={tile.publisher.name}
          sellerAvatar={tile.publisher.avatar}
          tileName={tile.name}
          tilePriceSol={tile.price}
          tileId={tile.id}
        />
      )}
    </div>
  );
}
