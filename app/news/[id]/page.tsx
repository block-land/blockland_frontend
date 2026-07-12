"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Share2, Twitter, Copy, Check, MessageSquare } from "lucide-react";
import { FaTelegramPlane } from "react-icons/fa";
import { DUMMY_NEWS, getCategoryBadgeColor } from "@/lib/news";
import { withCustomButton } from "@/components/custom/button_custom";

const LinkButtonCustom = withCustomButton(Link);

export default function NewsDetailPage() {
  const params = useParams();
  const newsId = params?.id as string;
  const item = DUMMY_NEWS.find((article) => article.id === newsId);

  const [copied, setCopied] = React.useState(false);

  if (!item) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">Article not found</h2>
        <p className="text-zinc-500 font-sans">The news article you are looking for does not exist.</p>
        <Link href="/news" className="text-primary hover:underline">
          Back to Newsroom
        </Link>
      </div>
    );
  }

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const relatedArticles = DUMMY_NEWS.filter((article) => article.id !== item.id).slice(0, 2);

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-24 font-sans">
      <div className="mx-auto max-w-[900px] px-6 sm:px-10 space-y-10">
        
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Newsroom
          </Link>
        </div>

        {/* Article Meta Header */}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl border ${getCategoryBadgeColor(item.category)}`}>
              {item.category}
            </span>
            <div className="flex gap-4 items-center text-xs text-zinc-550 font-mono">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {item.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {item.readTime}
              </span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {item.title}
          </h1>

          {/* Author Block */}
          <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-900 rounded-2xl">
            <div className="flex items-center gap-3">
              <img
                src={item.author.avatar}
                alt={item.author.name}
                className="w-10 h-10 rounded-full object-cover border border-zinc-800"
              />
              <div>
                <h5 className="font-bold text-white text-sm">{item.author.name}</h5>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.author.role}</p>
              </div>
            </div>

            {/* Social Share actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                title="Copy Link"
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                {copied ? <Check className="h-4.5 w-4.5 text-emerald-500" /> : <Copy className="h-4.5 w-4.5" />}
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(item.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Share on X"
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all"
              >
                <Twitter className="h-4.5 w-4.5" />
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}&text=${encodeURIComponent(item.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Share on Telegram"
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all"
              >
                <FaTelegramPlane className="h-4.5 w-4.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Feature Cover Image */}
        <div className="relative aspect-video w-full rounded-3xl overflow-hidden border border-zinc-900">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Main Content Body */}
        <article className="prose prose-invert max-w-none text-zinc-300 text-base sm:text-lg leading-relaxed space-y-6 font-sans">
          {item.content.map((p, index) => (
            <p key={index} className="indent-0">
              {p}
            </p>
          ))}
        </article>

        {/* Footer separator line */}
        <div className="h-px bg-zinc-900 pt-8" />

        {/* Related Articles Footer section */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            Related Articles
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {relatedArticles.map((article) => (
              <Link
                key={article.id}
                href={`/news/${article.id}`}
                className="bg-zinc-955 border border-zinc-900 rounded-2xl p-5 block hover:border-zinc-800 transition-all hover:scale-[1.01] group space-y-4"
              >
                <div className="space-y-2">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getCategoryBadgeColor(article.category)}`}>
                    {article.category}
                  </span>
                  <h4 className="font-bold text-white group-hover:text-primary transition-colors text-base line-clamp-2 leading-snug">
                    {article.title}
                  </h4>
                </div>
                <div className="flex gap-4 items-center text-[10px] text-zinc-550 font-mono">
                  <span>{article.date}</span>
                  <span>•</span>
                  <span>{article.readTime}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
