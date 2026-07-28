"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchNews, type NewsItem } from "@/lib/news";
import { BACKEND_URL } from "@/lib/api";
import { Edit2, Trash2, Plus, Eye, Loader2, BookOpen, Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export default function AdminNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetchNews();
    if (res.ok) {
      setNews(res.news);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/news/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Article deleted successfully!");
        load();
      } else {
        toast.error(data.error || "Failed to delete article");
      }
    } catch (err) {
      toast.error("Failed to connect to backend");
    }
  };

  const filtered = news.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.author.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans text-white w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">News Manager</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Manage and publish news articles for the Blockland Ecosystem
          </p>
        </div>
        <Link
          href="/dashboard/news/create"
          className="flex items-center gap-1.5 text-xs font-semibold text-black bg-primary hover:opacity-90 transition-opacity rounded-xl px-4 py-2.5 cursor-pointer shadow-lg"
        >
          <Plus className="h-4 w-4" /> Add Article
        </Link>
      </div>

      {/* Search filter bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex gap-4 items-center justify-between shadow-sm">
        <InputGroup className="bg-black h-[40px] rounded-xl border-zinc-850 focus-within:border-zinc-700 w-full sm:max-w-xs">
          <InputGroupAddon align="inline-start">
            <Search className="h-4 w-4 text-zinc-550 shrink-0" />
          </InputGroupAddon>
          <InputGroupInput
            type="text"
            placeholder="Filter by title or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs text-white placeholder-zinc-650 font-medium"
          />
          {search && (
            <InputGroupAddon align="inline-end">
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </InputGroupAddon>
          )}
        </InputGroup>
        <span className="text-xs text-zinc-550 font-semibold">{filtered.length} articles found</span>
      </div>

      {/* Articles table / card list */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
          <BookOpen className="h-10 w-10 text-zinc-750 mx-auto" />
          <h3 className="font-semibold text-lg text-white">No articles found</h3>
          <p className="text-zinc-500 text-sm max-w-sm mx-auto">
            {search
              ? "No matching news articles fit your filter."
              : "Click Add Article to publish your first update."}
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-md w-full">
          <Table>
            <TableHeader className="border-b border-zinc-850 bg-zinc-900/50">
              <TableRow className="border-b-0 hover:bg-transparent">
                <TableHead className="p-4 sm:p-5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider h-auto align-middle">
                  Article
                </TableHead>
                <TableHead className="p-4 sm:p-5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider h-auto align-middle">
                  Category
                </TableHead>
                <TableHead className="p-4 sm:p-5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider h-auto align-middle">
                  Author
                </TableHead>
                <TableHead className="p-4 sm:p-5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider h-auto align-middle">
                  Date
                </TableHead>
                <TableHead className="p-4 sm:p-5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider text-right h-auto align-middle">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-850 text-xs border-t-0">
              {filtered.map((item) => (
                <TableRow key={item.id} className="border-b border-zinc-850 hover:bg-zinc-900/60 transition-colors">
                  <TableCell className="p-4 sm:p-5 font-semibold text-white max-w-xs sm:max-w-md truncate align-middle">
                    {item.title}
                  </TableCell>
                  <TableCell className="p-4 sm:p-5 align-middle">
                    <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded">
                      {item.category}
                    </span>
                  </TableCell>
                  <TableCell className="p-4 sm:p-5 text-zinc-300 font-medium align-middle">
                    {item.author.name}
                  </TableCell>
                  <TableCell className="p-4 sm:p-5 text-zinc-400 align-middle">
                    {item.date}
                  </TableCell>
                  <TableCell className="p-4 sm:p-5 text-right space-x-2 whitespace-nowrap align-middle">
                    <Link
                      href={`/news/${item.slug}`}
                      target="_blank"
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 transition-colors"
                      title="View Publicly"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/dashboard/news/edit/${item.id}`}
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary hover:text-black text-primary transition-all"
                      title="Edit Article"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-400 transition-all cursor-pointer"
                      title="Delete Article"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
