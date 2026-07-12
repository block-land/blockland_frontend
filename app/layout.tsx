import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import LayoutsClient from "@/components/layouts_client";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Blockland",
  description: "Blockland landing page",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <NextTopLoader color="#F1C67C" showSpinner={false} />
        <LayoutsClient>{children}</LayoutsClient>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
