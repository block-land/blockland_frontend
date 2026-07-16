"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Send,
  MessageSquare,
  ShieldCheck,
  CheckCheck,
  Loader2,
  MapPin,
  Wallet,
  UserPlus,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Avatar from "boring-avatars";
import { useWallets } from "@privy-io/react-auth/solana";
import { useChat } from "@/lib/useChat";
import {
  type Conversation,
  type SearchedUser,
  buildTileThumbnailUrl,
  lamportsToSol,
  searchUsers,
} from "@/lib/chat";

/** Default prefilled message when entering a thread from a tile (Shopee-style). */
const TILE_PREFILL = "Hi, is this tile still available?";

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 2) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function shortWallet(addr: string): string {
  if (!addr) return "";
  return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

export default function MessagePage() {
  // useSearchParams must be inside a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <MessagePageInner />
    </Suspense>
  );
}

function MessagePageInner() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const { wallets } = useWallets();
  const currentWallet = wallets[0]?.address ?? null;

  const {
    conversations,
    activeId,
    activeConversation,
    messages,
    connected,
    loadingConversations,
    sending,
    selectConversation,
    send,
  } = useChat(currentWallet);

  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ---- New Chat (search user) dialog state ----
  const [showNewChat, setShowNewChat] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<SearchedUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  // A pending recipient staged from the search dialog (no conversation yet).
  const [pendingRecipient, setPendingRecipient] = useState<{
    walletAddress: string;
    username: string;
    photoUrl: string | null;
  } | null>(null);

  // Debounced user search (by username OR wallet address). The current wallet
  // is always excluded by the backend so the caller can never self-chat.
  useEffect(() => {
    if (!userQuery.trim() || userQuery.trim().length < 2) {
      setUserResults([]);
      setSearchingUsers(false);
      return;
    }
    setSearchingUsers(true);
    const t = setTimeout(async () => {
      const res = await searchUsers(userQuery.trim(), currentWallet);
      setUserResults(res.ok ? res.users : []);
      setSearchingUsers(false);
    }, 300);
    return () => clearTimeout(t);
  }, [userQuery, currentWallet]);

  // ---- Read deep-link params from "Chat Seller" (Shopee-style) ----
  const sellerWallet = searchParams.get("seller");
  const tileId = searchParams.get("tile");

  useEffect(() => {
    setMounted(true);
  }, []);

  // When arriving from a tile (seller + tile params), find or create the
  // conversation by sending the prefilled opener. This runs once.
  const initFromTile = useRef(false);
  useEffect(() => {
    if (!mounted || !currentWallet || !sellerWallet || initFromTile.current) return;

    // Don't chat with yourself.
    if (sellerWallet === currentWallet) return;

    // If a conversation with this seller already exists, just open it + prefill.
    const existing = conversations.find(
      (c) => c.other.walletAddress === sellerWallet
    );

    initFromTile.current = true;

    if (existing) {
      selectConversation(existing.id);
      if (tileId) setNewMessage(TILE_PREFILL);
    } else {
      // Preload the opener into the input; user can edit before sending.
      // The conversation row is created on first send.
      if (tileId) setNewMessage(TILE_PREFILL);
    }
  }, [mounted, currentWallet, sellerWallet, tileId, conversations, selectConversation]);

  // Auto-scroll to newest message.
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeId, messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentWallet) return;

    const recipient =
      activeConversation?.other.walletAddress ??
      pendingRecipient?.walletAddress ??
      sellerWallet ??
      null;
    if (!recipient) return;

    const text = newMessage;
    setNewMessage("");
    const ok = await send({
      recipientWallet: recipient,
      text,
      tileId: tileId ?? activeConversation?.tileId ?? undefined,
    });
    // First message to a staged recipient — clear the pending state.
    if (ok && pendingRecipient) setPendingRecipient(null);
  };

  /** Start a chat with a searched user: open existing thread or stage a new one. */
  const startChatWith = (user: SearchedUser) => {
    setShowNewChat(false);
    setUserQuery("");
    setUserResults([]);

    const existing = conversations.find(
      (c) => c.other.walletAddress === user.walletAddress
    );
    if (existing) {
      selectConversation(existing.id);
      setPendingRecipient(null);
    } else {
      // No conversation yet — stage the recipient so the input shows and the
      // first send creates the thread.
      setActiveThreadManual(user);
    }
  };

  // Set a staged recipient as the active "thread" (used before the first send).
  const setActiveThreadManual = (user: SearchedUser) => {
    setPendingRecipient({
      walletAddress: user.walletAddress,
      username: user.username,
      photoUrl: user.photoUrl,
    });
  };

  const filteredThreads = conversations.filter((t) =>
    t.other.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // A staged recipient from the search dialog creates a synthetic "active"
  // conversation view before the first message is sent (no DB row yet).
  const displayConversation: Conversation | null =
    activeConversation ??
    (pendingRecipient
      ? {
          id: "pending",
          participantA: currentWallet ?? "",
          participantB: pendingRecipient.walletAddress,
          tileId: null,
          lastMessageText: null,
          lastMessageAt: null,
          unread: 0,
          createdAt: new Date().toISOString(),
          other: {
            walletAddress: pendingRecipient.walletAddress,
            username: pendingRecipient.username,
            photoUrl: pendingRecipient.photoUrl,
          },
          tile: null,
        }
      : null);

  if (!mounted) {
    return <div className="min-h-screen bg-black" />;
  }

  // ---- Not connected to a wallet ----
  if (!currentWallet) {
    return (
      <div className="h-[calc(100vh-100px)] mx-auto flex w-full max-w-[1440px] flex-col px-6 py-4 sm:px-10 lg:px-[68px] overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <Wallet className="h-12 w-12 text-zinc-700" />
          <h3 className="font-semibold text-white text-lg">Connect your wallet</h3>
          <p className="text-zinc-500 text-sm max-w-xs">
            Connect a Solana wallet to start chatting with sellers.
          </p>
        </div>
      </div>
    );
  }

  // ---- Trying to chat with your own tile ----
  if (sellerWallet && sellerWallet === currentWallet) {
    return (
      <div className="h-[calc(100vh-100px)] mx-auto flex w-full max-w-[1440px] flex-col px-6 py-4 sm:px-10 lg:px-[68px] overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <ShieldCheck className="h-12 w-12 text-primary" />
          <h3 className="font-semibold text-white text-lg">This is your tile</h3>
          <p className="text-zinc-500 text-sm max-w-xs">
            You can't start a conversation with yourself.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] mx-auto flex w-full max-w-[1440px] flex-col px-6 py-4 sm:px-10 lg:px-[68px] overflow-hidden">
      <div className="flex-1 flex gap-6 h-full overflow-hidden">
        {/* Left Column: Messages List Sidebar */}
        <div className="w-full md:w-[350px] shrink-0 bg-zinc-950 border border-zinc-900 rounded-3xl flex flex-col overflow-hidden">
          {/* Header & Search */}
          <div className="p-5 border-b border-zinc-900 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" /> Messages
              </h2>
              <span
                className={`flex items-center gap-1.5 text-[10px] font-mono ${
                  connected ? "text-emerald-500" : "text-zinc-500"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    connected ? "bg-emerald-500" : "bg-zinc-600"
                  }`}
                />
                {connected ? "Live" : "Connecting"}
              </span>
              <button
                onClick={() => setShowNewChat(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-black bg-primary hover:opacity-90 transition-opacity rounded-lg px-2.5 py-1.5 cursor-pointer"
                title="Start a new chat"
              >
                <UserPlus className="h-3.5 w-3.5" /> New Chat
              </button>
            </div>
            <div className="relative bg-black flex gap-2.5 h-[40px] items-center px-3 rounded-xl border border-zinc-800 focus-within:border-zinc-700">
              <Search className="h-4 w-4 text-zinc-550 shrink-0" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none p-0 text-sm text-white placeholder-zinc-550"
              />
            </div>
          </div>

          {/* Threads List */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {loadingConversations && filteredThreads.length === 0 ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <MessageSquare className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500">
                    No conversations yet. Chat a seller from a tile listing.
                  </p>
                </div>
              ) : (
                filteredThreads.map((thread) => (
                  <ConversationListItem
                    key={thread.id}
                    thread={thread}
                    active={thread.id === activeId}
                    onSelect={() => selectConversation(thread.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Column: Chat Screen Area */}
        <div className="flex-1 bg-zinc-950 border border-zinc-900 rounded-3xl flex flex-col overflow-hidden">
          {displayConversation ? (
            <>
              {/* Active Header */}
              <div className="bg-zinc-900 border-b border-zinc-800 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ParticipantAvatar photoUrl={displayConversation.other.photoUrl} name={displayConversation.other.username} size={40} />
                  <div>
                    <h3 className="font-semibold text-white text-base flex items-center gap-1.5">
                      {displayConversation.other.username}
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">
                      {shortWallet(displayConversation.other.walletAddress)}
                    </p>
                  </div>
                </div>
                {displayConversation.tile && (
                  <TileContextCard tile={displayConversation.tile} compact />
                )}
              </div>

              {/* Chat Viewport messages area */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  {/* Full tile context card shown once at the top of the thread */}
                  {displayConversation.tile && (
                    <div className="flex justify-center mb-2">
                      <TileContextCard tile={displayConversation.tile} />
                    </div>
                  )}
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-center py-10">
                      <p className="text-xs text-zinc-500">
                        No messages yet. Say hi 👋
                      </p>
                    </div>
                  )}
                  {messages.map((msg) => {
                    const isOwn = msg.senderWallet === currentWallet;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isOwn ? "items-end" : "items-start"
                        }`}
                      >
                        <div className="flex items-end gap-2 max-w-[70%] group">
                          {!isOwn && (
                            <ParticipantAvatar
                              photoUrl={displayConversation.other.photoUrl}
                              name={displayConversation.other.username}
                              size={24}
                            />
                          )}
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words ${
                              isOwn
                                ? "bg-primary text-black rounded-tr-none font-medium"
                                : "bg-zinc-900 border border-zinc-800 text-white rounded-tl-none"
                            }`}
                          >
                            <p>{msg.text}</p>
                          </div>
                        </div>
                        <span className="text-[9px] text-zinc-550 mt-1 px-8 font-mono flex items-center gap-1">
                          {formatTime(msg.createdAt)}
                          {isOwn && <CheckCheck className="h-3 w-3 text-primary" />}
                        </span>
                      </div>
                    );
                  })}

                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Chat Input form footer */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-zinc-900 bg-zinc-900/30 flex gap-3 items-center"
              >
                <input
                  type="text"
                  placeholder="Aa"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none ring-0 focus:ring-0 text-white placeholder-zinc-600"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-3 rounded-xl bg-primary text-black disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-all cursor-pointer shrink-0 flex items-center justify-center"
                >
                  {sending ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <Send className="h-4.5 w-4.5" />
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <MessageSquare className="h-12 w-12 text-zinc-700" />
              <h3 className="font-semibold text-white text-lg">No active conversation</h3>
              <p className="text-zinc-500 text-sm max-w-xs">
                {sellerWallet && tileId
                  ? "Type a message to start chatting with this seller."
                  : "Select a conversation from the sidebar to start messaging."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat — search user dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" /> Start a New Chat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-xs text-zinc-500">
              Search by username or wallet address.
            </p>
            <div className="relative bg-black flex gap-2.5 h-[40px] items-center px-3 rounded-xl border border-zinc-800 focus-within:border-zinc-700">
              <Search className="h-4 w-4 text-zinc-550 shrink-0" />
              <input
                type="text"
                placeholder="Username or wallet address..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                autoFocus
                className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none p-0 text-sm text-white placeholder-zinc-550"
              />
              {searchingUsers && (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-600 shrink-0" />
              )}
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1">
              {!searchingUsers && userQuery.trim().length >= 2 && userResults.length === 0 && (
                <p className="text-xs text-zinc-500 text-center py-6">
                  No users found.
                </p>
              )}
              {userResults.map((user) => (
                <button
                  key={user.walletAddress}
                  onClick={() => startChatWith(user)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-900 transition-colors text-left cursor-pointer border border-transparent hover:border-zinc-800"
                >
                  <ParticipantAvatar
                    photoUrl={user.photoUrl}
                    name={user.username}
                    size={36}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {user.username}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono truncate">
                      {shortWallet(user.walletAddress)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Conversation list item. */
function ConversationListItem({
  thread,
  active,
  onSelect,
}: {
  thread: Conversation;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all text-left cursor-pointer ${
        active
          ? "bg-zinc-900 border border-zinc-800"
          : "hover:bg-zinc-900/50 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <ParticipantAvatar photoUrl={thread.other.photoUrl} name={thread.other.username} size={40} />
          {thread.other.photoUrl === null && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-zinc-600 rounded-full border-2 border-zinc-955" />
          )}
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold text-sm text-white flex items-center gap-1">
            {thread.other.username}
            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          </h4>
          <p className="text-xs text-zinc-400 truncate mt-0.5 max-w-[160px]">
            {thread.lastMessageText || "No messages yet"}
          </p>
        </div>
      </div>

      <div className="text-right space-y-1.5 shrink-0">
        <span className="text-[10px] text-zinc-500 font-mono">
          {formatTime(thread.lastMessageAt)}
        </span>
        {thread.unread > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-semibold text-black mx-auto">
            {thread.unread}
          </span>
        )}
      </div>
    </button>
  );
}

/** Tile context card (Shopee-style product context above / beside a thread). */
function TileContextCard({
  tile,
  compact = false,
}: {
  tile: NonNullable<Conversation["tile"]>;
  compact?: boolean;
}) {
  const lat = parseFloat(tile.lat);
  const lng = parseFloat(tile.lng);
  const priceSol =
    tile.listingPriceLamports != null
      ? lamportsToSol(Number(tile.listingPriceLamports))
      : null;

  if (compact) {
    return (
      <div className="hidden lg:flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 max-w-[220px]">
        <img
          src={buildTileThumbnailUrl(lat, lng)}
          alt="tile"
          className="w-8 h-8 rounded-md object-cover border border-zinc-800 shrink-0"
        />
        <div className="min-w-0">
          <p className="text-[10px] text-zinc-400 flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" /> {lat.toFixed(3)}, {lng.toFixed(3)}
          </p>
          {priceSol != null && (
            <p className="text-[11px] font-semibold text-primary">
              {priceSol.toFixed(3)} SOL
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 max-w-sm">
      <img
        src={buildTileThumbnailUrl(lat, lng)}
        alt="tile"
        className="w-14 h-14 rounded-xl object-cover border border-zinc-800 shrink-0"
      />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">Tile</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${rarityBadge(tile.rarity)}`}>
            {tile.rarity}
          </span>
        </div>
        <p className="text-xs text-zinc-300 flex items-center gap-1 mt-0.5">
          <MapPin className="h-3 w-3 text-zinc-500" />
          {lat.toFixed(4)}°, {lng.toFixed(4)}°
        </p>
        {priceSol != null && (
          <p className="text-sm font-semibold text-primary mt-0.5">
            {priceSol.toFixed(3)} SOL
          </p>
        )}
      </div>
    </div>
  );
}

/** Avatar with boring-avatars fallback when no photo URL is set. */
function ParticipantAvatar({
  photoUrl,
  name,
  size,
}: {
  photoUrl: string | null;
  name: string;
  size: number;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-zinc-800 shrink-0"
      />
    );
  }
  // Deterministic pixel avatar (same lib used on the marketplace detail page).
  return (
    <div style={{ width: size, height: size }} className="shrink-0">
      <Avatar
        size={size}
        variant="pixel"
        name={name || "anon"}
        colors={["#f5e1a4", "#d9d593", "#ee7f27", "#bc162a", "#302325"]}
      />
    </div>
  );
}

/** Rarity badge color (mirrors lib/tiles.ts getRarityBadgeColor). */
function rarityBadge(rarity: string): string {
  switch (rarity) {
    case "Legendary":
      return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
    case "Epic":
      return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
    case "Rare":
      return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
    default:
      return "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30";
  }
}
