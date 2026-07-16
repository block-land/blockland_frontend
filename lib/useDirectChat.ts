"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ChatMessage,
  sendMessage as apiSendMessage,
  getMessages,
  markRead,
  findOrCreateConversation,
  streamUrl,
} from "./chat";

/**
 * Lightweight single-conversation realtime hook for the Chat Seller widget.
 *
 * Unlike useChat (which manages the full inbox), this hook opens ONE
 * conversation between the current user and a recipient, loads its history,
 * and listens for live messages via SSE.
 *
 * Self-guard: if recipientWallet === currentWallet, the hook no-ops.
 */
export function useDirectChat(
  currentWallet: string | null | undefined,
  recipientWallet: string | null | undefined,
  tileId?: string | null,
  enabled = true
) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);

  // Refs so the SSE callback reads current values without re-subscribing.
  const convIdRef = useRef<string | null>(null);
  useEffect(() => {
    convIdRef.current = conversationId;
  }, [conversationId]);

  const isSelf =
    !!currentWallet && !!recipientWallet && currentWallet === recipientWallet;

  // ---- Find-or-create conversation + load history ----
  useEffect(() => {
    if (!enabled || !currentWallet || !recipientWallet || isSelf) {
      setConversationId(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await findOrCreateConversation(currentWallet, recipientWallet, tileId);
      if (cancelled) return;
      if (res.ok && res.conversationId) {
        setConversationId(res.conversationId);
        const hist = await getMessages(res.conversationId);
        if (cancelled) return;
        setMessages(hist.ok ? hist.messages : []);
        await markRead(res.conversationId, currentWallet);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, currentWallet, recipientWallet, tileId, isSelf]);

  // ---- SSE realtime stream for this wallet ----
  useEffect(() => {
    if (!enabled || !currentWallet || isSelf) return;
    const es = new EventSource(streamUrl(currentWallet));

    es.addEventListener("ready", () => setConnected(true));
    es.addEventListener("ping", () => setConnected(true));

    es.addEventListener("message", (e) => {
      try {
        const payload = JSON.parse(e.data);
        const msg: ChatMessage = payload.message;
        if (!msg?.id) return;
        // Only react to messages in THIS conversation.
        if (payload.conversationId !== convIdRef.current) return;

        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
        // Auto-mark-read for incoming messages while the widget is open.
        if (msg.senderWallet !== currentWallet && convIdRef.current) {
          markRead(convIdRef.current, currentWallet);
        }
      } catch {
        /* ignore malformed payloads */
      }
    });

    es.onerror = () => setConnected(false);
    return () => {
      es.close();
      setConnected(false);
    };
  }, [enabled, currentWallet, isSelf]);

  // ---- Send a message ----
  const send = useCallback(
    async (text: string): Promise<boolean> => {
      if (!currentWallet || !recipientWallet || !text.trim() || isSelf) return false;

      setSending(true);
      const tempId = `optimistic-${Date.now()}`;
      const optimistic: ChatMessage = {
        id: tempId,
        conversationId: conversationId ?? "",
        senderWallet: currentWallet,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        readAt: null,
      };
      setMessages((prev) => [...prev, optimistic]);

      const res = await apiSendMessage({
        senderWallet: currentWallet,
        recipientWallet,
        text: text.trim(),
        tileId: tileId ?? undefined,
      });

      setSending(false);

      if (res.ok && res.conversationId) {
        // Swap the temp id for the authoritative id the backend persists, so
        // the SSE echo dedupes against the same id (no duplicate bubble).
        if (res.tempMessageId && res.tempMessageId !== tempId) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, id: res.tempMessageId! } : m))
          );
        }
        // Track the conversation if it was just created.
        setConversationId((prev) => prev ?? res.conversationId!);
        return true;
      }
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return false;
    },
    [currentWallet, recipientWallet, conversationId, tileId, isSelf]
  );

  return {
    conversationId,
    messages,
    loading,
    sending,
    connected,
    isSelf,
    send,
  };
}
