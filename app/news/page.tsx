"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Calendar, Clock, BookOpen, Loader2 } from "lucide-react";
import { getCategoryBadgeColor, fetchNews, type NewsItem } from "@/lib/news";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import Avatar from "boring-avatars";

export default function NewsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch news from backend
  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetchNews(selectedCategory, debouncedSearch);
      if (res.ok) {
        setNews(res.news);
      }
      setLoading(false);
    }
    load();
  }, [selectedCategory, debouncedSearch]);

  const displayNews = news;

  const categories = ["All", "Announcement", "Development", "Marketplace", "Ecosystem"];

  return (
    <div className="min-h-screen bg-black text-white pt-16 md:pt-32 pb-24 font-sans">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-[68px] space-y-12">
        
        {/* Header Title */}
        <div className="space-y-4 max-w-2xl">
          <div className="text-primary text-sm  tracking-widest uppercase">
            Blockland Newsroom
          </div>
          <h1 className="text-4xl sm:text-5xl  tracking-tight text-white">
            Ecosystem <span className="text-primary">Updates</span>
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Stay up to date with the latest announcements, engineering deep-dives, and guides from the Blockland core developers.
          </p>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between border-t border-b border-zinc-900 py-6">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 items-center">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs  border transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-primary text-black border-primary"
                    : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <InputGroup className="bg-zinc-950 h-[44px] rounded-xl border-zinc-800 w-full md:w-[320px]">
            <InputGroupAddon align="inline-start">
              <Search className="h-4.5 w-4.5 text-zinc-500 shrink-0" />
            </InputGroupAddon>
            <InputGroupInput
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs text-white placeholder-zinc-500"
            />
          </InputGroup>
        </div>

        {/* Grid List */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : displayNews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayNews.map((item) => (
              <article
                key={item.id}
                className="bg-zinc-955 border border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-800 transition-all duration-300 hover:scale-[1.01] flex flex-col group"
              >
                <Link href={`/news/${item.slug}`} className="block relative aspect-video overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-zinc-950 to-transparent opacity-60" />
                  <span className={`absolute top-4 left-4 text-[9px]  uppercase tracking-wider px-2 py-0.5 rounded border backdrop-blur-md ${getCategoryBadgeColor(item.category)}`}>
                    {item.category}
                  </span>
                </Link>
 
                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="flex gap-4 items-center text-[10px] text-zinc-550 ">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {item.date}
                      </span>
                    </div>
 
                    <Link href={`/news/${item.slug}`}>
                      <h3 className="text-xl  text-white group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                    </Link>

                    <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                      {item.content?.[0]
                        ? item.content[0].replace(/<[^>]*>/g, "").slice(0, 160)
                        : ""}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-zinc-800 shrink-0">
                        <Avatar
                          size={24}
                          name={item.author.name}
                          colors={[
                            "#f5e1a4",
                            "#d9d593",
                            "#ee7f27",
                            "#bc162a",
                            "#302325",
                          ]}
                          variant="pixel"
                        />
                      </div>
                      <span className="text-[10px]  text-zinc-300">{item.author.name}</span>
                    </div>
 
                    <Link
                      href={`/news/${item.slug}`}
                      className="text-[11px] text-primary"
                    >
                      Read Now
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-zinc-850 rounded-2xl space-y-4">
            <BookOpen className="h-10 w-10 text-zinc-700 mx-auto" />
            <h3 className=" text-lg text-white">No articles found</h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto">
              No matching news articles fit your search criteria. Let's try adjusting the filters.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
