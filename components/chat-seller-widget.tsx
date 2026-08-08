"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Send, Loader2 } from "lucide-react";
import Avatar from "boring-avatars";
import { useWallets } from "@privy-io/react-auth/solana";
import { useDirectChat } from "@/lib/useDirectChat";
import { type ConversationTile, buildTileThumbnailUrl, lamportsToSol } from "@/lib/chat";
import { MapPin } from "lucide-react";

/** Default prefilled message when opening from a tile (Shopee-style). */
const TILE_PREFILL = "Hi, is this tile still available?";

export interface ChatSellerWidgetProps {
  open: boolean;
  onClose: () => void;
  /** The seller's Solana wallet address (recipient). */
  sellerWallet: string;
  /** Display name + avatar for the seller header. */
  sellerName: string;
  sellerAvatar?: string;
  /** Tile context (shown as a small card in the header). */
  tileName?: string;
  tilePriceSol?: number;
  tileId?: string;
  /** Mapbox static thumbnail URL for the tile. */
  tileThumbnail?: string;
}

export default function ChatSellerWidget({
  open,
  onClose,
  sellerWallet,
  sellerName,
  sellerAvatar,
  tileName,
  tilePriceSol,
  tileId,
  tileThumbnail,
}: ChatSellerWidgetProps) {
  const [mounted, setMounted] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  // Whether the tile context should be attached to the next message.
  // Reset to true every time the widget opens.
  const [attachTile, setAttachTile] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { wallets } = useWallets();
  const currentWallet = wallets[0]?.address ?? null;

  const {
    messages,
    loading,
    sending,
    connected,
    isSelf,
    tileSent,
    send,
  } = useDirectChat(currentWallet, sellerWallet, tileId, open);

  // Prefill the opener once when the widget opens with a tile.
  const prefilled = useRef(false);
  useEffect(() => {
    if (open && tileName && !prefilled.current) {
      setNewMessage(TILE_PREFILL);
      prefilled.current = true;
    }
    if (!open) {
      prefilled.current = false;
    }
  }, [open, tileName]);

  // Reset the "attach tile" toggle each time the widget opens so the
  // tile context card is shown by default on a fresh open.
  useEffect(() => {
    if (open) setAttachTile(true);
  }, [open]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll to newest message. Uses the container's scrollTop directly
  // (instant) instead of scrollIntoView(smooth) so the bottom is reached
  // reliably even when optimistic + SSE messages land close together.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    // Defer until after the new messages are painted.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    const text = newMessage;
    setNewMessage("");
    await send(text, { attachTile });
  };

  return createPortal(
    <div className="fixed bottom-6 right-6 w-[360px] h-[480px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col z-[999] overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            {sellerAvatar ? (
              <img
                src={sellerAvatar}
                alt={sellerName}
                className="w-9 h-9 rounded-full object-cover border border-zinc-700"
              />
            ) : (
              <div className="w-9 h-9">
                <Avatar
                  size={36}
                  variant="pixel"
                  name={sellerName || "anon"}
                  colors={["#f5e1a4", "#d9d593", "#ee7f27", "#bc162a", "#302325"]}
                />
              </div>
            )}
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${
                connected ? "bg-emerald-500" : "bg-zinc-600"
              }`}
            />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm text-white truncate">
              {isSelf ? "Your own tile" : sellerName}
            </h4>
            <p className={`text-[10px] ${connected ? "text-emerald-500" : "text-zinc-500"}`}>
              {connected ? "Online" : "Connecting..."}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-zinc-800 shrink-0"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tile context card (dismissible — controls whether the tile is sent
          with the next message). Auto-hides once the tile has been sent. */}
      {tileName && attachTile && !tileSent && (
        <div className="bg-zinc-900/50 border-b border-zinc-800 px-4 py-2 flex items-center gap-2">
          {tileThumbnail ? (
            <img
              src={tileThumbnail}
              alt={tileName}
              className="w-7 h-7 rounded-md object-cover border border-zinc-700 shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-zinc-400 truncate">
              About: <span className="text-zinc-200">{tileName}</span>
            </p>
            {tilePriceSol != null && (
              <p className="text-[11px] font-semibold text-primary">
                {tilePriceSol.toFixed(3)} SOL
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAttachTile(false)}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-zinc-800 shrink-0"
            aria-label="Detach tile from message"
            title="Send without tile"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <p className="text-xs text-zinc-550">
              {isSelf
                ? "You can't start a conversation with yourself."
                : "No messages yet. Say hi 👋"}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderWallet === currentWallet;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isOwn ? "items-end" : "items-start"
                }`}
              >
                {/* Inline Tile Card if message references a tile */}
                {msg.tileId && msg.tile && (
                  <div className="max-w-[85%] mb-2">
                    <InlineTileCard tile={msg.tile} isOwn={isOwn} />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    isOwn
                      ? "bg-primary text-black rounded-tr-none font-medium"
                      : "bg-zinc-900 border border-zinc-800 text-white rounded-tl-none"
                  }`}
                  style={{
                    backgroundColor: isOwn ? "var(--color-primary)" : undefined,
                  }}
                >
                  <span className="leading-relaxed break-words">{msg.text}</span>
                </div>
                <span className="text-[9px] text-zinc-550 mt-1 px-1 ">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Send Input Footer */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-zinc-900 bg-zinc-900/30 flex gap-2 items-center"
      >
        <input
          type="text"
          placeholder={isSelf ? "Cannot chat with yourself" : "Aa"}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={isSelf}
          className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-full px-4 py-2 text-sm outline-none ring-0 focus:ring-0 text-white placeholder-zinc-650 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending || isSelf}
          className="p-2 rounded-full bg-primary text-black disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-all cursor-pointer flex items-center justify-center"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>,
    document.body
  );
}

/** Inline tile card rendered as a message bubble within the chat timeline. */
function InlineTileCard({
  tile,
  isOwn,
}: {
  tile: ConversationTile;
  isOwn: boolean;
}) {
  const lat = parseFloat(tile.lat);
  const lng = parseFloat(tile.lng);
  const priceSol =
    tile.listingPriceLamports != null
      ? lamportsToSol(Number(tile.listingPriceLamports))
      : null;

  return (
    <a
      href={`/marketplace/${tile.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 border rounded-2xl p-3 transition-colors cursor-pointer hover:border-primary/50 ${
        isOwn
          ? "bg-primary/10 border-primary/30 rounded-tr-none"
          : "bg-zinc-900 border-zinc-800 rounded-tl-none"
        }`}
    >
      <img
        src={buildTileThumbnailUrl(lat, lng)}
        alt="tile"
        className="w-12 h-12 rounded-lg object-cover border border-zinc-800 shrink-0"
      />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            Tile
          </span>
        </div>
        <p className="text-xs text-zinc-300 flex items-center gap-1 mt-0.5 min-w-0">
          <MapPin className="h-3 w-3 text-zinc-500 shrink-0" />
          <span className="truncate">
            {tile.placeName
              ? tile.placeName
              : (
                <span className="">
                  {lat.toFixed(4)}°, {lng.toFixed(4)}°
                </span>
              )}
          </span>
        </p>
        {priceSol != null && (
          <p className="text-sm font-semibold text-primary mt-0.5 ">
            {priceSol.toFixed(3)} SOL
          </p>
        )}
      </div>
    </a>
  );
}
