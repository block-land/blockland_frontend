"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Calendar, Clock, ArrowRight, BookOpen } from "lucide-react";
import { DUMMY_NEWS, getCategoryBadgeColor } from "@/lib/news";
import { withCustomButton } from "@/components/custom/button_custom";

const LinkButtonCustom = withCustomButton(Link);

export default function NewsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Filtering news list
  const filteredNews = DUMMY_NEWS.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const featuredNews = DUMMY_NEWS[0];
  const remainingNews = filteredNews.filter((item) => item.id !== featuredNews.id);

  const categories = ["All", "Announcement", "Development", "Marketplace", "Ecosystem"];

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-24 font-sans">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-[68px] space-y-12">
        
        {/* Header Title */}
        <div className="space-y-4 max-w-2xl">
          <span className="text-primary text-sm font-semibold tracking-widest uppercase">
            Blockland Newsroom
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Ecosystem <span className="text-primary">Updates</span>
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Stay up to date with the latest announcements, engineering deep-dives, and guides from the Blockland core developers.
          </p>
        </div>

        {/* Featured Banner Hero (If searching or filtering is active, skip or show conditional banner) */}
        {searchQuery === "" && selectedCategory === "All" && featuredNews && (
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden hover:border-zinc-800 transition-all duration-300 group grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Cover Image */}
            <div className="lg:col-span-7 relative aspect-video lg:aspect-auto overflow-hidden min-h-[300px]">
              <img
                src={featuredNews.imageUrl}
                alt={featuredNews.title}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-zinc-955 via-zinc-955/20 to-transparent opacity-90" />
            </div>

            {/* Content Details */}
            <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between space-y-8 lg:space-y-0">
              <div className="space-y-4">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl border ${getCategoryBadgeColor(featuredNews.category)}`}>
                  {featuredNews.category}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight group-hover:text-primary transition-colors">
                  {featuredNews.title}
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {featuredNews.excerpt}
                </p>
              </div>

              {/* Author & CTA */}
              <div className="flex items-center justify-between pt-6 border-t border-zinc-900/60">
                <div className="flex items-center gap-3">
                  <img
                    src={featuredNews.author.avatar}
                    alt={featuredNews.author.name}
                    className="w-9 h-9 rounded-full object-cover border border-zinc-800"
                  />
                  <div>
                    <h5 className="font-semibold text-white text-xs">{featuredNews.author.name}</h5>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{featuredNews.date}</p>
                  </div>
                </div>

                <LinkButtonCustom href={`/news/${featuredNews.id}`}>
                  Read Article
                </LinkButtonCustom>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between border-t border-b border-zinc-900 py-6">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 items-center">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
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
          <div className="relative bg-zinc-950 flex gap-2.5 h-[44px] items-center px-4 rounded-xl border border-zinc-800 focus-within:border-zinc-700 w-full md:w-[320px]">
            <Search className="h-4.5 w-4.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none p-0 text-xs text-white placeholder-zinc-500"
            />
          </div>
        </div>

        {/* Grid List */}
        {filteredNews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(searchQuery !== "" || selectedCategory !== "All" ? filteredNews : remainingNews).map((item) => (
              <article
                key={item.id}
                className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-800 transition-all duration-300 hover:scale-[1.01] flex flex-col group"
              >
                <Link href={`/news/${item.id}`} className="block relative aspect-video overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent opacity-60" />
                  <span className={`absolute top-4 left-4 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border backdrop-blur-md ${getCategoryBadgeColor(item.category)}`}>
                    {item.category}
                  </span>
                </Link>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="flex gap-4 items-center text-[10px] text-zinc-550 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {item.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {item.readTime}
                      </span>
                    </div>

                    <Link href={`/news/${item.id}`}>
                      <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                    </Link>

                    <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                      {item.excerpt}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
                    <div className="flex items-center gap-2">
                      <img
                        src={item.author.avatar}
                        alt={item.author.name}
                        className="w-6 h-6 rounded-full object-cover border border-zinc-800"
                      />
                      <span className="text-[10px] font-semibold text-zinc-300">{item.author.name}</span>
                    </div>

                    <Link
                      href={`/news/${item.id}`}
                      className="text-[11px] font-bold text-zinc-450 hover:text-white flex items-center gap-1 group/btn"
                    >
                      Read Now
                      <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-zinc-850 rounded-2xl space-y-4">
            <BookOpen className="h-10 w-10 text-zinc-700 mx-auto" />
            <h3 className="font-bold text-lg text-white">No articles found</h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto">
              No matching news articles fit your search criteria. Let's try adjusting the filters.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
