"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getAdminSession, logoutAdmin } from "@/lib/adminAuth";
import { LayoutDashboard, Newspaper, LogOut, Loader2 } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface AdminUser {
  id: string;
  email: string;
}

export default function LayoutsAdmin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    document.body.classList.add("admin-page");
    return () => {
      document.body.classList.remove("admin-page");
    };
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const session = await getAdminSession();
      if (!session || !session.user) {
        router.push("/login");
      } else {
        setUser(session.user);
        setLoading(false);
      }
    }
    checkAuth();
  }, [router, pathname]);

  const handleLogout = async () => {
    const res = await logoutAdmin();
    if (res.ok) {
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-zinc-400 text-sm">Checking admin session...</p>
      </div>
    );
  }

  const menuItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "News Manager", href: "/dashboard/news", icon: Newspaper },
  ];

  return (
    <SidebarProvider>
      {/* Sidebar */}
      <Sidebar className="border-zinc-800 text-white border-r">
          <SidebarHeader className="p-6 border-b border-zinc-850 bg-zinc-900">
            <Link href="/dashboard" className="flex items-center gap-2">
              <img src="/img/logo_white.png" className="w-[120px]" alt="Blockland Logo" />
              <span className="text-[9px] font-semibold bg-primary/20 text-primary border border-primary/30 rounded px-1.5 py-0.5">
                Admin
              </span>
            </Link>
          </SidebarHeader>

          <SidebarContent className="p-4 bg-zinc-900 flex-1">
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all h-[40px] ${
                        active
                          ? "bg-primary text-black hover:bg-primary/90 hover:text-black data-[active=true]:bg-primary data-[active=true]:text-black"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800/65"
                      }`}
                    >
                      <Link href={item.href}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-zinc-850 space-y-4 bg-zinc-900">
            <div className="px-4 py-2.5 bg-zinc-950 rounded-xl border border-zinc-850">
              <p className="text-[10px] text-zinc-550 truncate">Logged in as</p>
              <p className="text-xs font-semibold text-zinc-300 truncate mt-0.5">{user?.email}</p>
            </div>
            <SidebarMenuButton
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer text-left h-[40px]"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content Pane */}
        <SidebarInset className="flex-1 flex flex-col overflow-hidden w-full bg-zinc-950 border-0">
          {/* Mobile Header */}
          <header className="md:hidden bg-zinc-900 border-b border-zinc-850 p-4 flex items-center justify-between z-10 w-full">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-white hover:text-primary hover:bg-zinc-850" />
              <Link href="/dashboard" className="flex items-center gap-2">
                <img src="/img/logo_white.png" className="w-[100px]" alt="Blockland Logo" />
                <span className="text-[8px] font-semibold bg-primary/20 text-primary border border-primary/30 rounded px-1.5 py-0.5">
                  Admin
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-zinc-950">
            <div className="max-w-[1200px] mx-auto space-y-6">
              {children}
            </div>
          </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
