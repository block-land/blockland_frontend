import type { Metadata } from "next";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  fetchNews,
  fetchNewsItem,
} from "@/lib/news";
import NewsDetailClient from "./news-detail-client";

/**
 * Dynamic metadata for social sharing (OG / Twitter cards).
 *
 * Fetches the article server-side so crawlers (Twitter, Facebook, Telegram,
 * etc.) immediately see the correct title and cover image without executing
 * any client-side JavaScript.
 */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const slug = params?.slug;
  if (!slug) {
    return { title: "Article" };
  }

  const res = await fetchNewsItem(slug);
  const item = res.ok ? res.news : undefined;

  if (!item) {
    return { title: "Article Not Found" };
  }

  return {
    title: item.title,
    description: `${item.category} · ${item.date}`,
    openGraph: {
      type: "article",
      title: item.title,
      description: `${item.category} · ${item.date}`,
      images: [{ url: item.imageUrl, alt: item.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description: `${item.category} · ${item.date}`,
      images: [item.imageUrl],
    },
  };
}

export default async function NewsDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params?.slug;

  if (!slug) {
    return <NotFound />;
  }

  const resItem = await fetchNewsItem(slug);
  const item = resItem.ok ? resItem.news : undefined;

  if (!item) {
    return <NotFound />;
  }

  // Fetch related articles (exclude the current one, take 2).
  const resList = await fetchNews();
  const relatedArticles = resList.ok
    ? resList.news.filter((article) => article.slug !== item.slug).slice(0, 2)
    : [];

  return <NewsDetailClient item={item} relatedArticles={relatedArticles} />;
}

function NotFound() {
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
