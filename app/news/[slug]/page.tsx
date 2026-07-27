"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Twitter,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { FaTelegramPlane } from "react-icons/fa";
import {
  getCategoryBadgeColor,
  fetchNews,
  fetchNewsItem,
  type NewsItem,
} from "@/lib/news";
import { Separator } from "@/components/ui/separator";
import Avatar from "boring-avatars";

/**
 * Render a content fragment to safe HTML.
 *
 * New articles are authored with TipTap and stored as HTML — pass through
 * directly (the editor already emits a limited, safe tag set). Legacy articles
 * were stored as plain markdown fragments; for those we apply the minimal
 * markdown transform below as a fallback so old posts still render readable.
 */
function renderContent(text: string): string {
  // Heuristic: if the fragment looks like HTML (contains a tag), treat it as
  // TipTap HTML and pass through.
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }
  // Legacy markdown fallback (bold, italic, links, headings).
  const html = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>',
    );
  if (text.startsWith("### ")) {
    return `<h3 class="text-lg font-bold text-white mt-4 mb-2">${html.slice(4)}</h3>`;
  }
  if (text.startsWith("## ")) {
    return `<h2 class="text-xl font-bold text-white mt-6 mb-2">${html.slice(3)}</h2>`;
  }
  if (text.startsWith("# ")) {
    return `<h1 class="text-2xl font-bold text-white mt-8 mb-4">${html.slice(2)}</h1>`;
  }
  return `<p>${html}</p>`;
}

export default function NewsDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [item, setItem] = React.useState<NewsItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [relatedArticles, setRelatedArticles] = React.useState<NewsItem[]>([]);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!slug) return;

    async function load() {
      setLoading(true);
      const resItem = await fetchNewsItem(slug);
      if (resItem.ok && resItem.news) {
        setItem(resItem.news);

        // Fetch related articles
        const resList = await fetchNews();
        if (resList.ok) {
          const filtered = resList.news
            .filter((article) => article.slug !== resItem.news!.slug)
            .slice(0, 2);
          setRelatedArticles(filtered);
        }
      } else {
        setItem(null);
      }
      setLoading(false);
    }

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-zinc-550 font-sans text-sm">Loading article...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl ">Article not found</h2>
        <p className="text-zinc-500 font-sans">
          The news article you are looking for does not exist.
        </p>
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

  return (
    <div className="min-h-screen bg-black text-white pt-16 md:pt-32 pb-24 font-sans">
      <div className="mx-auto max-w-[900px] px-6 sm:px-10 space-y-10">
        {/* Navigation Breadcrumb */}
        <div>
          <Link href="/news" className="text-primary text-sm">
            Back to Newsroom
          </Link>
        </div>

        {/* Article Meta Header */}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <span
              className={`text-[10px]  uppercase tracking-wider px-2.5 py-1 rounded-xl border ${getCategoryBadgeColor(item.category)}`}
            >
              {item.category}
            </span>
            <div className="flex gap-4 items-center text-xs text-zinc-550 ">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {item.date}
              </span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl tracking-tight text-white leading-tight">
            {item.title}
          </h1>

          {/* Author Block */}
          <div className="flex items-center justify-between p-4 bg-zinc-955 border border-zinc-900 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-800 shrink-0">
                <Avatar
                  size={40}
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
              <div>
                <h5 className=" text-white text-sm">{item.author.name}</h5>
                <p className="text-[10px] text-zinc-500  mt-0.5">
                  {item.author.role}
                </p>
              </div>
            </div>

            {/* Social Share actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                title="Copy Link"
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                {copied ? (
                  <Check className="h-4.5 w-4.5 text-emerald-500" />
                ) : (
                  <Copy className="h-4.5 w-4.5" />
                )}
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
        <article className="prose prose-invert max-w-none text-zinc-300 text-base sm:text-lg leading-relaxed space-y-6 font-sans [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-zinc-400">
          {item.content.map((p, index) => (
            <div key={index} className="indent-0" dangerouslySetInnerHTML={{ __html: renderContent(p) }} />
          ))}
        </article>

        {/* Footer separator line */}
        {/* <div className="h-px bg-zinc-900 pt-8" /> */}
        <Separator/>

        {/* Related Articles Footer section */}
        <div className="space-y-6">
          <h3 className="text-xl  text-white flex items-center gap-2">
            Related Articles
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {relatedArticles.map((article) => (
              <Link
                key={article.id}
                href={`/news/${article.slug}`}
                className="bg-zinc-955 border border-zinc-900 rounded-2xl p-5 block hover:border-zinc-800 transition-all hover:scale-[1.01] group space-y-4"
              >
                <div className="space-y-2">
                  <div>
                    <span
                      className={`text-[9px]  uppercase tracking-wider px-2 py-0.5 rounded border ${getCategoryBadgeColor(article.category)}`}
                    >
                      {article.category}
                    </span>
                  </div>
                  <h4 className=" text-white group-hover:text-primary transition-colors text-base line-clamp-2 leading-snug">
                    {article.title}
                  </h4>
                </div>
                <div className="flex gap-4 items-center text-[10px] text-zinc-550 ">
                  <span>{article.date}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
