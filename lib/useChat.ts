"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Conversation,
  type ChatMessage,
  sendMessage as apiSendMessage,
  listConversations,
  getMessages,
  markRead,
  streamUrl,
} from "./chat";

/**
 * Realtime chat hook.
 *
 * - Loads the conversation list + active conversation messages on mount / wallet change.
 * - Keeps an EventSource open to /api/messages/stream for live message + conversation updates.
 * - Exposes `send`, `selectConversation`, `markConversationRead`.
 *
 * The hook is client-only; callers must guard wallet presence.
 */
export function useChat(currentWallet: string | null | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Keep latest activeId in a ref so the SSE handler reads current value.
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  // ---- Load conversation list ----
  const refreshConversations = useCallback(async (wallet: string) => {
    setLoadingConversations(true);
    const res = await listConversations(wallet);
    if (res.ok) {
      setConversations(res.conversations);
    }
    setLoadingConversations(false);
  }, []);

  // ---- Load messages for a conversation ----
  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    const res = await getMessages(convId);
    if (res.ok) {
      setMessages(res.messages);
    }
    setLoadingMessages(false);
  }, []);

  // ---- Initial load when wallet connects ----
  useEffect(() => {
    if (!currentWallet) {
      setConversations([]);
      setMessages([]);
      setActiveId(null);
      return;
    }
    refreshConversations(currentWallet);
  }, [currentWallet, refreshConversations]);

  // ---- Selecting a conversation loads its messages + marks read ----
  const selectConversation = useCallback(
    async (convId: string | null) => {
      setActiveId(convId);
      if (!convId || !currentWallet) {
        setMessages([]);
        return;
      }
      await loadMessages(convId);
      await markRead(convId, currentWallet);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread: 0 } : c))
      );
    },
    [currentWallet, loadMessages]
  );

  // ---- SSE realtime stream ----
  useEffect(() => {
    if (!currentWallet) return;
    const es = new EventSource(streamUrl(currentWallet));

    es.addEventListener("ready", () => setConnected(true));
    es.addEventListener("ping", () => setConnected(true));

    es.addEventListener("message", (e) => {
      try {
        const payload = JSON.parse(e.data);
        const msg: ChatMessage = payload.message;
        if (!msg?.id) return;

        const convId: string = payload.conversationId;

        // Append to active conversation messages if it matches.
        if (activeIdRef.current === convId) {
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
          // If the incoming message is from the other person and the thread is
          // open, mark it read immediately.
          if (msg.senderWallet !== currentWallet && currentWallet) {
            markRead(convId, currentWallet);
            setConversations((prev) =>
              prev.map((c) =>
                c.id === convId ? { ...c, unread: 0 } : c
              )
            );
          }
        }

        // Update the conversation list (last message preview, ordering, unread).
        setConversations((prev) => {
          const exists = prev.find((c) => c.id === convId);
          const isOwn = msg.senderWallet === currentWallet;
          const bumpUnread =
            !isOwn && activeIdRef.current !== convId ? 1 : 0;

          const updated: Conversation = exists
            ? {
                ...exists,
                lastMessageText: payload.lastMessageText ?? msg.text,
                lastMessageAt: payload.lastMessageAt ?? msg.createdAt,
                unread:
                  isOwn || activeIdRef.current === convId
                    ? exists.unread
                    : exists.unread + bumpUnread,
              }
            : {
                id: convId,
                participantA: "",
                participantB: "",
                tileId: null,
                lastMessageText: payload.lastMessageText ?? msg.text,
                lastMessageAt: payload.lastMessageAt ?? msg.createdAt,
                unread: bumpUnread,
                createdAt: msg.createdAt,
                other: { walletAddress: msg.senderWallet, username: "Anonymous", photoUrl: null },
                tile: null,
              };

          const rest = prev.filter((c) => c.id !== convId);
          // Keep most-recent first.
          return [updated, ...rest];
        });
      } catch {
        /* ignore malformed payloads */
      }
    });

    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects; nothing else to do here.
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [currentWallet]);

  // ---- Send a message ----
  const send = useCallback(
    async (params: {
      recipientWallet: string;
      text: string;
      tileId?: string | null;
    }): Promise<boolean> => {
      if (!currentWallet || !params.text.trim()) return false;
      setSending(true);

      // Optimistic: append the message locally immediately. We use a temp id
      // now; once the backend responds we swap it for the authoritative
      // tempMessageId (which the backend also uses as the DB row id) so the
      // SSE echo dedupes against the same id and never produces a duplicate.
      const tempId = `optimistic-${Date.now()}`;
      const optimistic: ChatMessage = {
        id: tempId,
        conversationId: activeIdRef.current ?? "",
        senderWallet: currentWallet,
        text: params.text.trim(),
        createdAt: new Date().toISOString(),
        readAt: null,
      };
      setMessages((prev) => [...prev, optimistic]);

      const res = await apiSendMessage({
        senderWallet: currentWallet,
        recipientWallet: params.recipientWallet,
        text: params.text.trim(),
        tileId: params.tileId ?? undefined,
      });

      setSending(false);

      if (res.ok && res.conversationId) {
        // Swap the temp id for the authoritative one the backend will persist.
        if (res.tempMessageId && res.tempMessageId !== tempId) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, id: res.tempMessageId! } : m))
          );
        }
        // If this created a new conversation, refresh the list so it appears.
        const known = conversations.find((c) => c.id === res.conversationId);
        if (!known) {
          refreshConversations(currentWallet);
        }
        // Ensure the active thread tracks the conversation that was sent to.
        if (activeIdRef.current !== res.conversationId) {
          setActiveId(res.conversationId);
          loadMessages(res.conversationId);
          markRead(res.conversationId, currentWallet);
        }
        return true;
      }
      // On failure, drop the optimistic message.
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return false;
    },
    [currentWallet, conversations, refreshConversations, loadMessages]
  );

  return {
    conversations,
    activeId,
    activeConversation,
    messages,
    connected,
    loadingConversations,
    loadingMessages,
    sending,
    selectConversation,
    send,
    refreshConversations,
  };
}
