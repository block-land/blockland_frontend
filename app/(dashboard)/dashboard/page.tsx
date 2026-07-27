"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BACKEND_URL } from "@/lib/api";
import { Newspaper, PlusCircle, MapPin, Loader2 } from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ totalNews: 0, totalSoldTiles: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/stats`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setStats({
              totalNews: data.totalNews,
              totalSoldTiles: data.totalSoldTiles,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-8 font-sans text-white w-full">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">Overview of the Blockland administration portal</p>
        </div>
        <Link
          href="/dashboard/news/create"
          className="flex items-center gap-1.5 text-xs font-semibold text-black bg-primary hover:opacity-90 transition-opacity rounded-xl px-4 py-2.5 cursor-pointer shadow-lg"
        >
          <PlusCircle className="h-4 w-4" /> Create Article
        </Link>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total News */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center gap-4 shadow-md">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Newspaper className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total News Articles</p>
            <p className="text-2xl font-bold text-white mt-1">{loading ? "..." : stats.totalNews}</p>
          </div>
        </div>
        
        {/* Total Sold Tiles */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center gap-4 shadow-md">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Tiles Sold</p>
            <p className="text-2xl font-bold text-white mt-1">{loading ? "..." : stats.totalSoldTiles}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
