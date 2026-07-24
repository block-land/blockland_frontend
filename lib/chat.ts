/**
 * Frontend client + shared types for the chat/messaging feature.
 *
 * Realtime transport is SSE (EventSource); message persistence is async via
 * BullMQ on the backend. This module only contains pure fetch helpers + types;
 * the realtime wiring lives in lib/useChat.ts.
 */

import { BACKEND_URL } from "@/lib/api";

export const chatBaseUrl = BACKEND_URL;

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderWallet: string;
  text: string;
  createdAt: string; // ISO
  readAt: string | null; // ISO
}

export interface OtherParticipant {
  walletAddress: string;
  username: string;
  photoUrl: string | null;
}

export interface ConversationTile {
  id: string;
  lat: string;
  lng: string;
  rarity: string;
  listingPriceLamports: string | null;
}

export interface Conversation {
  id: string;
  participantA: string;
  participantB: string;
  tileId: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null; // ISO
  unread: number;
  createdAt: string; // ISO
  other: OtherParticipant;
  tile: ConversationTile | null;
}

export interface SendMessageResult {
  ok: boolean;
  conversationId?: string;
  tempMessageId?: string;
  error?: string;
}

export interface MessagesResult {
  ok: boolean;
  messages: ChatMessage[];
  hasMore: boolean;
  error?: string;
}

export interface ConversationsResult {
  ok: boolean;
  conversations: Conversation[];
  error?: string;
}

/**
 * Send a message. Returns 202 with the conversationId + a temp message id.
 * The actual message is persisted asynchronously by the BullMQ worker and
 * pushed back to this client (and the recipient) via SSE.
 */
export async function sendMessage(params: {
  senderWallet: string;
  recipientWallet: string;
  text: string;
  tileId?: string | null;
}): Promise<SendMessageResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("sendMessage error:", err);
    return { ok: false, error: "Network error" };
  }
}

/** List all conversations for a wallet (with counterpart profile + context tile). */
export async function listConversations(
  wallet: string
): Promise<ConversationsResult> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/messages/conversations?wallet=${encodeURIComponent(wallet)}`
    );
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("listConversations error:", err);
    return { ok: false, conversations: [], error: "Network error" };
  }
}

/** Load message history for a conversation (cursor-based, older than `before`). */
export async function getMessages(
  conversationId: string,
  before?: string,
  limit = 30
): Promise<MessagesResult> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set("before", before);
    const res = await fetch(
      `${BACKEND_URL}/api/messages/conversations/${conversationId}/messages?${params}`
    );
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("getMessages error:", err);
    return { ok: false, messages: [], hasMore: false, error: "Network error" };
  }
}

/** Mark a conversation as read for the given wallet. */
export async function markRead(
  conversationId: string,
  wallet: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/messages/conversations/${conversationId}/read`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      }
    );
    const data = await res.json();
    return !!data.ok;
  } catch (err) {
    console.error("markRead error:", err);
    return false;
  }
}

/** Build the SSE stream URL for a wallet. Used by useChat's EventSource. */
export function streamUrl(wallet: string): string {
  return `${BACKEND_URL}/api/messages/stream?wallet=${encodeURIComponent(wallet)}`;
}

/** Find-or-create a conversation between two wallets (returns conversationId). */
export async function findOrCreateConversation(
  me: string,
  them: string,
  tileId?: string | null
): Promise<{ ok: boolean; conversationId?: string; error?: string }> {
  try {
    const params = new URLSearchParams({ me, them });
    if (tileId) params.set("tile", tileId);
    const res = await fetch(`${BACKEND_URL}/api/messages/conversation?${params}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("findOrCreateConversation error:", err);
    return { ok: false, error: "Network error" };
  }
}

/** Build a Mapbox static-map thumbnail URL for a tile card (dark theme). */
export function buildTileThumbnailUrl(lat: number, lng: number): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${lng},${lat},14,0,0/400x225@2x?access_token=${token}`;
}

/** Lamports -> SOL (mirrors lib/solana/mint.ts without the import cycle). */
const LAMPORTS_PER_SOL = 1_000_000_000;
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export interface SearchedUser {
  walletAddress: string;
  username: string;
  photoUrl: string | null;
}

export interface SearchUsersResult {
  ok: boolean;
  users: SearchedUser[];
  error?: string;
}

/**
 * Search registered users by username OR wallet address, to start a new chat.
 * `excludeWallet` (the caller's own wallet) is passed to the backend so the
 * caller never appears in results — prevents the self-chat bug.
 */
export async function searchUsers(
  q: string,
  excludeWallet?: string | null
): Promise<SearchUsersResult> {
  try {
    const params = new URLSearchParams({ q });
    if (excludeWallet) params.set("exclude", excludeWallet);
    const res = await fetch(`${BACKEND_URL}/api/client/search?${params}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("searchUsers error:", err);
    return { ok: false, users: [], error: "Network error" };
  }
}
