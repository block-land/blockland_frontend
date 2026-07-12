"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Grid, Calendar, User, ShieldCheck, Share2, DollarSign, MessageSquare, Send, X, Minimize2, Tag } from "lucide-react";
import { withCustomButton } from "@/components/custom/button_custom";
import { useDialogStore } from "@/store/useDialogStore";
import { DUMMY_TILES, getRarityBadgeColor } from "@/lib/tiles";
import { ScrollArea } from "@/components/ui/scroll-area";

const ButtonCustom = withCustomButton("button");

export default function TileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);

  const tileId = params?.id as string;
  const tile = DUMMY_TILES.find((t) => t.id === tileId);

  const [offerPrice, setOfferPrice] = React.useState("");

  // Offer List States
  const [offers, setOffers] = React.useState<Array<{ id: string; bidder: string; price: number; date: string; avatar: string }>>([
    {
      id: "off-01",
      bidder: "0x3a9b...e901",
      price: Math.round((tile ? tile.price : 100) * 0.85),
      date: "2 hours ago",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=60"
    },
    {
      id: "off-02",
      bidder: "0x8f3c...f12b",
      price: Math.round((tile ? tile.price : 100) * 0.90),
      date: "1 day ago",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60"
    }
  ]);

  // Chat Messenger States
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [messages, setMessages] = React.useState<Array<{ sender: "user" | "seller"; text: string; time: string }>>([]);
  const [newMessage, setNewMessage] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll chat to bottom
  React.useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Initializing greeting message
  React.useEffect(() => {
    if (tile) {
      setMessages([
        {
          sender: "seller",
          text: `Hi! Are you interested in the "${tile.name}" coordinate unit? Feel free to negotiate or ask questions here!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    }
  }, [tileId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMsg = {
      sender: "user" as const,
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setNewMessage("");
    setIsTyping(true);

    // Simulated responses
    const botResponses = [
      "That sounds like a fair point. Please place your official offer using the make an offer box so I can accept it on-chain.",
      "I acquired this coordinate unit during the genesis phase. It holds high strategic value, but I'm open to negotiating the price.",
      "Could you raise your offer slightly? I have other collectors looking at this specific landmark coordinate.",
      "Thanks for reaching out! Let me check the current bids and I'll get back to you shortly.",
    ];

    setTimeout(() => {
      setIsTyping(false);
      const randomReply = botResponses[Math.floor(Math.random() * botResponses.length)];
      setMessages((prev) => [
        ...prev,
        {
          sender: "seller" as const,
          text: randomReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1500);
  };

  if (!tile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">Tile not found</h2>
        <p className="text-zinc-500">The coordinate unit you are looking for does not exist.</p>
        <Link href="/marketplace" className="text-primary hover:underline">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const handleBuy = () => {
    openDialog(
      "Confirm Purchase",
      <div className="space-y-6 text-zinc-300">
        <div className="flex gap-4 items-start border-b border-zinc-800 pb-4">
          <img
            src={tile.imageUrl}
            alt={tile.name}
            className="w-20 h-20 object-cover rounded-lg border border-zinc-800"
          />
          <div className="space-y-1">
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getRarityBadgeColor(tile.rarity)}`}>
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
            <span>Price</span>
            <span className="font-semibold text-primary">{tile.price} USDC</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Transaction Fee</span>
            <span className="text-zinc-500">0.05 USDC</span>
          </div>
          <div className="border-t border-zinc-800 pt-3 flex justify-between font-bold text-white text-base">
            <span>Total Cost</span>
            <span className="text-primary">{tile.price + 0.05} USDC</span>
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
            type="button"
            onClick={() => {
              // Simulating transaction success dialog
              openDialog(
                "Transaction Success",
                <div className="text-center space-y-4 py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-xl border border-emerald-500/20">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Tile Acquired!</h4>
                    <p className="text-sm text-zinc-400 mt-1">
                      You are now the proud owner of <strong>{tile.name}</strong> coordinate unit.
                    </p>
                  </div>
                  <div className="text-xs font-mono bg-black p-3 rounded-lg border border-zinc-800 text-zinc-500 text-left overflow-x-auto">
                    Tx: 4v7yJ...H98t1x
                  </div>
                  <ButtonCustom onClick={closeDialog} className="w-full justify-center">
                    Close
                  </ButtonCustom>
                </div>
              );
            }}
            className="flex-1 bg-primary hover:bg-primary/95 text-black font-semibold py-3 rounded-xl transition-all cursor-pointer text-sm"
          >
            Confirm Buy
          </button>
        </div>
      </div>
    );
  };

  const handleMakeOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerPrice || parseFloat(offerPrice) <= 0) return;

    openDialog(
      "Confirm Offer Submission",
      <div className="space-y-6 text-zinc-300">
        <div className="flex gap-4 items-start border-b border-zinc-800 pb-4">
          <img
            src={tile.imageUrl}
            alt={tile.name}
            className="w-20 h-20 object-cover rounded-lg border border-zinc-800"
          />
          <div className="space-y-1">
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getRarityBadgeColor(tile.rarity)}`}>
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
            <span>Current Price</span>
            <span className="text-zinc-400 font-semibold">{tile.price} USDC</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Your Offering Price</span>
            <span className="font-semibold text-primary">{offerPrice} USDC</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Offer Expiry</span>
            <span className="text-zinc-400">7 Days</span>
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
            type="button"
            onClick={() => {
              openDialog(
                "Offer Submitted",
                <div className="text-center space-y-4 py-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl border border-primary/20">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Offer Submitted Successfully!</h4>
                    <p className="text-sm text-zinc-400 mt-1">
                      Your offer of <strong>{offerPrice} USDC</strong> has been submitted to the publisher.
                    </p>
                  </div>
                  <ButtonCustom onClick={() => {
                    // Add new offer to list dynamically
                    setOffers((prev) => [
                      {
                        id: `off-${Date.now()}`,
                        bidder: "You (0xActive)",
                        price: parseFloat(offerPrice),
                        date: "Just now",
                        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60"
                      },
                      ...prev
                    ]);
                    setOfferPrice("");
                    closeDialog();
                  }} className="w-full justify-center">
                    Close
                  </ButtonCustom>
                </div>
              );
            }}
            className="flex-1 bg-primary hover:bg-primary/95 text-black font-semibold py-3 rounded-xl transition-all cursor-pointer text-sm"
          >
            Submit Offer
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-24 font-sans">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-[68px] space-y-8">
        
        {/* Back Link */}
        <div>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
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
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-4 items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-xl border backdrop-blur-md ${getRarityBadgeColor(tile.rarity)}`}>
                  {tile.rarity}
                </span>
                <div className="flex gap-2 text-sm text-white font-mono bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800">
                  <Grid className="h-4 w-4 text-primary shrink-0" />
                  <span>{tile.coordinates}</span>
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 sm:p-8 space-y-6">
              <h3 className="text-xl font-bold text-white border-b border-zinc-900 pb-4">
                Technical Data Specs
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <span className="text-zinc-500 font-mono">TILE ID</span>
                  <p className="text-zinc-200 font-mono font-medium">{tile.id}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-zinc-500 font-mono">COORDINATES</span>
                  <p className="text-zinc-200 font-mono font-medium">{tile.coordinates}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-zinc-500 font-mono">COUNTRY</span>
                  <p className="text-zinc-200 font-medium">{tile.country}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-zinc-500 font-mono">LOCATION</span>
                  <p className="text-zinc-200 font-medium">{tile.location}</p>
                </div>
              </div>
            </div>

            {/* Simulated Coordinate Map Grid View */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 sm:p-8 space-y-4">
              <h3 className="text-xl font-bold text-white">Coordinate Satellite Area</h3>
              <p className="text-sm text-zinc-500">
                This Coordinate Unit grid is secured dynamically on the Solana blockchain.
              </p>
              <div className="aspect-[3/1] bg-radial from-zinc-900 to-black rounded-2xl border border-zinc-850 flex items-center justify-center relative overflow-hidden">
                {/* Visual grid layout */}
                <div className="absolute inset-0 grid grid-cols-12 grid-rows-3 divide-x divide-y divide-zinc-900/50 pointer-events-none opacity-40" />
                <div className="z-10 text-center space-y-1 font-mono">
                  <div className="inline-block p-2 rounded-full bg-primary/10 border border-primary/20 text-primary animate-pulse mb-1">
                    🎯
                  </div>
                  <div className="text-xs text-white font-semibold">{tile.coordinates}</div>
                  <div className="text-[10px] text-zinc-500">{tile.location}</div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Financial detail & Action box */}
          <div className="lg:col-span-5 bg-zinc-950 border border-zinc-900 rounded-3xl p-6 sm:p-8 space-y-8 sticky top-28">
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
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
                <span className="text-4xl font-extrabold text-primary font-mono">{tile.price}</span>
                <span className="text-lg font-bold text-zinc-300 font-mono">USDC</span>
              </div>
            </div>

            {/* Offering Input Block */}
            <form onSubmit={handleMakeOffer} className="space-y-3 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-900">
              <h4 className="text-xs text-zinc-400 uppercase tracking-wider font-mono">Make an Offer</h4>
              <div className="flex gap-2">
                <div className="relative flex-1 bg-black flex gap-2 h-[48px] items-center px-4 rounded-xl border border-zinc-800 focus-within:border-zinc-700">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Offering price in USDC"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none p-0 text-[15px] font-normal text-white placeholder-zinc-650"
                    required
                  />
                  <span className="text-xs font-mono text-zinc-500 shrink-0 select-none">USDC</span>
                </div>
                <button
                  type="submit"
                  className="bg-transparent hover:bg-zinc-800 border border-zinc-800 text-white font-semibold px-4 rounded-xl transition-all cursor-pointer text-sm shrink-0"
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
              <ScrollArea className="h-[140px] pr-2">
                <div className="space-y-3">
                  {offers.sort((a, b) => b.price - a.price).map((off) => (
                    <div key={off.id} className="flex items-center justify-between p-3 bg-black/45 border border-zinc-900 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={off.avatar}
                          alt={off.bidder}
                          className="w-7 h-7 rounded-full object-cover border border-zinc-800"
                        />
                        <div>
                          <p className="text-xs font-semibold text-zinc-300">{off.bidder}</p>
                          <span className="text-[9px] text-zinc-550 font-mono">{off.date}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-primary font-mono">{off.price} USDC</span>
                        <p className="text-[8px] text-emerald-500 font-mono">Pending</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Publisher Block info */}
            <div className="space-y-4">
              <h4 className="text-xs text-zinc-500 uppercase tracking-wider font-mono">Listed Publisher</h4>
              <div className="flex items-center justify-between p-4 bg-black/40 border border-zinc-900 rounded-2xl">
                <div className="flex items-center gap-3">
                  <img
                    src={tile.publisher.avatar}
                    alt={tile.publisher.name}
                    className="w-10 h-10 rounded-full object-cover border border-zinc-800"
                  />
                  <div>
                    <h5 className="font-bold text-white text-sm flex items-center gap-1">
                      {tile.publisher.name}
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                    </h5>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{tile.publisher.walletAddress}</p>
                  </div>
                </div>
                <div className="text-right space-y-1 font-mono text-[11px] text-zinc-500">
                  <div className="flex items-center gap-1 justify-end">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Listed</span>
                  </div>
                  <span className="text-zinc-400 font-semibold">{tile.date}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-4 pt-4 border-t border-zinc-900">
              <ButtonCustom onClick={handleBuy} className="w-full justify-center py-4 text-base font-bold">
                Buy Coordinate Unit
              </ButtonCustom>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 py-3 rounded-xl transition-all cursor-pointer font-semibold text-sm text-white"
                >
                  <MessageSquare className="h-4 w-4" /> Chat Seller
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 py-3 rounded-xl transition-all cursor-pointer font-semibold text-sm">
                  <Share2 className="h-4 w-4" /> Share
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
      {/* Facebook Messenger Style Chat Box using React Portal to escape parent transforms */}
      {isChatOpen && mounted && createPortal(
        <div className="fixed bottom-6 right-6 w-[360px] h-[480px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col z-[999] overflow-hidden">
          {/* Header */}
          <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={tile.publisher.avatar}
                  alt={tile.publisher.name}
                  className="w-9 h-9 rounded-full object-cover border border-zinc-700"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-900" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-1">
                  {tile.publisher.name}
                </h4>
                <p className="text-[10px] text-emerald-500">Active now</p>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.sender === "user"
                      ? "bg-primary text-black rounded-tr-none font-medium"
                      : "bg-zinc-900 border border-zinc-800 text-white rounded-tl-none"
                  }`}
                  style={{
                    backgroundColor: msg.sender === "user" ? "var(--color-primary)" : undefined,
                  }}
                >
                  <p className="leading-relaxed break-words">{msg.text}</p>
                </div>
                <span className="text-[9px] text-zinc-550 mt-1 px-1 font-mono">
                  {msg.time}
                </span>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex flex-col items-start">
                <div className="bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-2xl rounded-tl-none px-4 py-2 text-xs flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Send Input Footer */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-900 bg-zinc-900/30 flex gap-2 items-center">
            <input
              type="text"
              placeholder="Aa"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-full px-4 py-2 text-sm outline-none ring-0 focus:ring-0 text-white placeholder-zinc-650"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-2 rounded-full bg-primary text-black disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-all cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
