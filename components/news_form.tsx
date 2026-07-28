/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { type NewsItem } from "@/lib/news";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Loader2, ArrowLeft, Send, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TiptapEditor = dynamic(() => import("@/components/tiptap_editor"), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] border border-zinc-800 rounded-xl bg-zinc-950 flex items-center justify-center text-zinc-550 text-xs">
      <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading editor...
    </div>
  ),
});

interface NewsFormData {
  title: string;
  content: string[];
  category: string;
  imageUrl: string;
}

interface NewsFormProps {
  initialData?: NewsItem;
  onSubmit: (data: NewsFormData) => Promise<void>;
  isSubmitting: boolean;
  titleText: string;
}

export default function NewsForm({
  initialData,
  onSubmit,
  isSubmitting,
  titleText,
}: NewsFormProps) {
  const [title, setTitle] = useState("");
  const [contentText, setContentText] = useState("");
  const [category, setCategory] = useState("Announcement");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Populate initial data for edit mode
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setContentText(initialData.content ? initialData.content.join("") : "");
      setCategory(initialData.category || "Announcement");
      setImageUrl(initialData.imageUrl || "");
    }
  }, [initialData]);

  const onDrop = React.useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];

    setUploadingImage(true);
    const url = await uploadToCloudinary(file);
    setUploadingImage(false);

    if (url) {
      setImageUrl(url);
    } else {
      alert("Failed to upload image to Cloudinary. Check env credentials.");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
    disabled: uploadingImage,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // TipTap outputs a single HTML document; store it as a single-element
    // array to fit the backend's text[] content contract. Each display render
    // treats an element as one HTML fragment.
    const content = contentText.trim() ? [contentText] : [];

    const formData = {
      title,
      content,
      category,
      imageUrl,
    };

    onSubmit(formData);
  };

  return (
    <div className="space-y-6 font-sans text-white">
      {/* Header and Back Link */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/news"
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-primary transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{titleText}</h1>
          <p className="text-zinc-500 text-xs mt-0.5">
            Fill in the fields below to publish news updates
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-md"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

           {/* Cover Image Upload (react-dropzone + Cloudinary) */}
          <div className="md:col-span-12 space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">Cover Image</label>
            {imageUrl ? (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-zinc-800 group">
                <img
                  src={imageUrl}
                  alt="Cover Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute top-3 right-3 p-2 bg-black/80 hover:bg-black rounded-full text-zinc-400 hover:text-white transition-all cursor-pointer border border-zinc-800"
                  title="Remove Image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px] ${
                  isDragActive
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-zinc-800 bg-black hover:border-zinc-700 text-zinc-400"
                } ${uploadingImage ? "opacity-50 pointer-events-none" : ""}`}
              >
                <input {...getInputProps()} />
                {uploadingImage ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p className="text-xs text-zinc-400 font-semibold">
                      Uploading to Cloudinary...
                    </p>
                  </>
                ) : (
                  <>
                    <UploadCloud
                      className={`h-8 w-8 mb-2 ${isDragActive ? "text-primary" : "text-zinc-650"}`}
                    />
                    {isDragActive ? (
                      <p className="text-xs font-semibold">Drop the image here...</p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold">
                          Drag & drop cover image here, or click to select
                        </p>
                        <p className="text-[10px] text-zinc-600">
                          Supports PNG, JPG, JPEG, WEBP
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="md:col-span-8 space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">Article Title</label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Blockland Launches USA Genesis Phase"
              className="w-full bg-black border border-zinc-850 focus:border-zinc-700 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl px-4 py-3 text-xs outline-none text-white placeholder-zinc-650 font-medium h-[44px]"
              required
            />
          </div>

          {/* Category */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">Category</label>
            <Select value={category} onValueChange={(val) => setCategory(val)}>
              <SelectTrigger className="w-full bg-black border border-zinc-850 focus:ring-0 focus:ring-offset-0 rounded-xl px-4 py-3 text-xs outline-none text-white font-semibold cursor-pointer h-[44px] justify-between">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border border-zinc-850 text-white">
                <SelectItem className="cursor-pointer focus:bg-zinc-900 focus:text-white" value="Announcement">Announcement</SelectItem>
                <SelectItem className="cursor-pointer focus:bg-zinc-900 focus:text-white" value="Development">Development</SelectItem>
                <SelectItem className="cursor-pointer focus:bg-zinc-900 focus:text-white" value="Marketplace">Marketplace</SelectItem>
                <SelectItem className="cursor-pointer focus:bg-zinc-900 focus:text-white" value="Ecosystem">Ecosystem</SelectItem>
              </SelectContent>
            </Select>
          </div>


          {/* Content Body */}
          <div className="md:col-span-12 space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 flex justify-between items-center">
              <span>Main Content / Paragraphs</span>
              <span className="text-[10px] text-zinc-555 normal-case font-normal">
                Press Enter to separate paragraphs
              </span>
            </label>
            <TiptapEditor
              content={contentText}
              onChange={setContentText}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-6 border-t border-zinc-850">
          <Link
            href="/dashboard/news"
            className="flex items-center justify-center px-6 py-3 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || uploadingImage}
            className="flex items-center justify-center gap-2 bg-primary text-black px-6 py-3 rounded-xl font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" /> Save Article
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
