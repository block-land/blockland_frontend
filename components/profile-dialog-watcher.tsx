"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import { useProfileStore } from "@/store/useProfileStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Loader2, UploadCloud, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { Label } from "./ui/label";

export default function ProfileDialogWatcher() {
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const { showProfileDialog, checkProfile, submitProfile } = useProfileStore();
  const [usernameInput, setUsernameInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    if (wallet?.address) {
      checkProfile(wallet.address);
    }
  }, [wallet?.address, checkProfile]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
    },
    maxFiles: 1,
    multiple: false,
    disabled: isSubmitting,
  });

  const clearSelectedFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
  };

  // Clean up Object URL on unmount
  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  const uploadToCloudinary = async (file: File): Promise<string | null> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (
      !cloudName ||
      !uploadPreset ||
      cloudName.includes("your_cloudinary") ||
      uploadPreset.includes("your_cloudinary")
    ) {
      console.warn(
        "Cloudinary credentials are not configured correctly in .env.local",
      );
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );
      if (!res.ok) {
        throw new Error("Cloudinary upload request failed");
      }
      const data = await res.json();
      return data.secure_url || null;
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      return null;
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet?.address) return;
    if (!usernameInput.trim()) {
      toast.error("Username is required");
      return;
    }

    setIsSubmitting(true);
    let uploadedPhotoUrl = "";

    if (selectedFile) {
      toast.info("Uploading profile picture...");
      const url = await uploadToCloudinary(selectedFile);
      if (url) {
        uploadedPhotoUrl = url;
      } else {
        toast.error(
          "Failed to upload image to Cloudinary, profile will save without photo",
        );
      }
    }

    const success = await submitProfile(
      wallet.address,
      usernameInput.trim(),
      uploadedPhotoUrl,
    );
    setIsSubmitting(false);

    if (success) {
      toast.success("Profile details saved successfully!");
      setUsernameInput("");
      setSelectedFile(null);
      setFilePreview(null);
    } else {
      toast.error("Failed to save profile details");
    }
  };

  return (
    <Dialog open={showProfileDialog} onOpenChange={() => {}}>
      <DialogContent className="min-w-2xl p-6 bg-zinc-950 border border-zinc-800 rounded-2xl text-white">
        <DialogHeader>
          <DialogTitle className="text-center">
            Complete Your Profile
          </DialogTitle>
          {/* <DialogDescription>
            Please enter your details to register in the Blockland system.
          </DialogDescription> */}
        </DialogHeader>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="space-y-2">
            <div>
              <Label htmlFor="username">
                Username <span className="text-red-500">*</span>
              </Label>
            </div>
            <Input
              id="username"
              type="text"
              placeholder="Enter username"
              required
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="bg-black border-zinc-800 text-white rounded-xl placeholder-zinc-600 focus-visible:ring-primary focus-visible:border-primary"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2 hidden">
            <div>
              <Label>Profile Photo (Optional)</Label>
            </div>

            {/* react-dropzone container */}
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer bg-black/40 min-h-[120px] ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-zinc-800 hover:border-zinc-700"
              } ${isSubmitting ? "opacity-50 pointer-events-none" : ""}`}
            >
              <input {...getInputProps()} />

              {filePreview ? (
                <div className="relative w-20 h-20 rounded-full overflow-hidden group border border-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                    title="Remove Image"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center space-y-2 text-zinc-500">
                  <UploadCloud className="h-8 w-8 text-zinc-600" />
                  <div className="text-xs">
                    {isDragActive ? (
                      <span className="text-primary font-medium">
                        Drop the image here ...
                      </span>
                    ) : (
                      <>
                        <span className="text-zinc-350 font-medium">
                          Click to upload
                        </span>{" "}
                        or drag and drop
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-600">
                    Supports PNG, JPG, JPEG or GIF
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : (
                "Save Profile"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
