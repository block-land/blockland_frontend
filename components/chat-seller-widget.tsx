"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Send, Loader2 } from "lucide-react";
import Avatar from "boring-avatars";
import { useWallets } from "@privy-io/react-auth/solana";
import { useDirectChat } from "@/lib/useDirectChat";

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
}: ChatSellerWidgetProps) {
  const [mounted, setMounted] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { wallets } = useWallets();
  const currentWallet = wallets[0]?.address ?? null;

  const {
    messages,
    loading,
    sending,
    connected,
    isSelf,
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll to newest message.
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
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
    await send(text);
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

      {/* Tile context card */}
      {tileName && (
        <div className="bg-zinc-900/50 border-b border-zinc-800 px-4 py-2 flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-400 truncate">
              About: <span className="text-zinc-200">{tileName}</span>
            </p>
            {tilePriceSol != null && (
              <p className="text-[11px] font-semibold text-primary">
                {tilePriceSol.toFixed(3)} SOL
              </p>
            )}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <p className="text-xs text-zinc-500">
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
                  <p className="leading-relaxed break-words">{msg.text}</p>
                </div>
                <span className="text-[9px] text-zinc-550 mt-1 px-1 font-mono">
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
