"use client";

import { useEffect, useRef, useState } from "react";
import { BACKEND_URL } from "@/lib/api";

/** A primary mint (purchased from the landmark page). */
export interface PurchaseEvent {
  assetId: string;
  buyer: string;
  priceLamports: string;
  txSignature: string;
  placeName: string | null;
  createdAt: string;
}

/** A secondary sale (tile sold by a user to another user). */
export interface SaleEvent {
  assetId: string;
  buyer: string;
  seller: string;
  priceLamports: string;
  txSignature: string;
  placeName: string | null;
  createdAt: string;
}

/** Profit from a secondary sale (sell price - seller's prior buy price). */
export interface ProfitEvent {
  assetId: string;
  seller: string;
  sellPriceLamports: string;
  buyPriceLamports: string;
  profitLamports: string;
  txSignature: string;
  placeName: string | null;
  createdAt: string;
}

/**
 * Homepage Live Activity hook — 3 separate realtime feeds.
 *
 * Seeds each category via REST on mount, then subscribes to the global SSE
 * stream. Each card updates independently when a matching event arrives.
 */
export function useLiveActivity() {
  const [purchased, setPurchased] = useState<PurchaseEvent | null>(null);
  const [sold, setSold] = useState<SaleEvent | null>(null);
  const [profit, setProfit] = useState<ProfitEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // 1. Seed all 3 categories from REST.
    fetch(`${BACKEND_URL}/api/activity/recent`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) return;
        if (data.purchased?.[0]) setPurchased(data.purchased[0]);
        if (data.sold?.[0]) setSold(data.sold[0]);
        if (data.profit?.[0]) setProfit(data.profit[0]);
      })
      .catch(() => {});

    // 2. Subscribe to the global SSE stream for live updates.
    const es = new EventSource(`${BACKEND_URL}/api/activity/stream`);
    esRef.current = es;

    es.addEventListener("ready", () => setConnected(true));
    es.addEventListener("ping", () => setConnected(true));

    es.addEventListener("mint", (e) => {
      try {
        setPurchased(JSON.parse((e as MessageEvent).data));
      } catch {}
    });
    es.addEventListener("sale", (e) => {
      try {
        setSold(JSON.parse((e as MessageEvent).data));
      } catch {}
    });
    es.addEventListener("profit", (e) => {
      try {
        setProfit(JSON.parse((e as MessageEvent).data));
      } catch {}
    });

    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, []);

  return { purchased, sold, profit, connected };
}
