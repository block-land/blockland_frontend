"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import NewsForm from "@/components/news_form";
import { BACKEND_URL } from "@/lib/api";
import { toast } from "sonner";

export default function AdminNewsCreatePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData: any) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/news`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("News article published successfully!");
        router.push("/dashboard/news");
      } else {
        toast.error(data.error || "Failed to publish article");
      }
    } catch (err) {
      toast.error("Failed to connect to backend");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <NewsForm
      titleText="Publish News Article"
      onSubmit={handleSubmit}
      isSubmitting={submitting}
    />
  );
}
