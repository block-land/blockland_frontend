"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession, loginAdmin } from "@/lib/adminAuth";
import { Loader2, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    document.body.classList.add("admin-page");
    return () => {
      document.body.classList.remove("admin-page");
    };
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const session = await getAdminSession();
      if (session && session.user) {
        router.push("/dashboard");
      } else {
        setChecking(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    const res = await loginAdmin(email, password);
    setLoading(false);

    if (res.ok) {
      toast.success("Welcome back, Admin!");
      router.push("/dashboard");
    } else {
      toast.error(res.data?.error?.message || "Invalid credentials");
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-zinc-400 text-sm">Checking admin session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-white font-sans w-full">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-850 rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <img src="/img/logo_white.png" className="w-[160px] mx-auto" alt="Logo" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 h-4.5 w-4.5 text-zinc-500 shrink-0 z-10" />
              <Input
                type="email"
                placeholder="admin@blockland.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 w-full bg-black border-zinc-850 focus:border-zinc-700 h-[44px] rounded-xl text-xs text-white placeholder-zinc-550 font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-4.5 w-4.5 text-zinc-500 shrink-0 z-10" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full bg-black border-zinc-850 focus:border-zinc-700 h-[44px] rounded-xl text-xs text-white placeholder-zinc-550 font-medium"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            // className="w-full flex items-center justify-center gap-2 bg-primary text-black h-[44px] rounded-xl font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
