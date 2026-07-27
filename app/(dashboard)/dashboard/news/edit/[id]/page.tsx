"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import NewsForm from "@/components/news_form";
import { fetchNewsItem, type NewsItem } from "@/lib/news";
import { BACKEND_URL } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminNewsEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [article, setArticle] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await fetchNewsItem(id);
      if (res.ok && res.news) {
        setArticle(res.news);
      } else {
        toast.error("Failed to load article");
        router.push("/dashboard/news");
      }
      setLoading(false);
    }
    load();
  }, [id, router]);

  const handleSubmit = async (formData: any) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/news/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("News article updated successfully!");
        router.push("/dashboard/news");
      } else {
        toast.error(data.error || "Failed to update article");
      }
    } catch (err) {
      toast.error("Failed to connect to backend");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-white gap-3 w-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-zinc-500 text-sm font-medium">Loading article data...</span>
      </div>
    );
  }

  if (!article) return null;

  return (
    <NewsForm
      titleText="Edit News Article"
      initialData={article}
      onSubmit={handleSubmit}
      isSubmitting={submitting}
    />
  );
}
