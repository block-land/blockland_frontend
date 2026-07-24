import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import LayoutsClient from "@/components/layouts_client";
import { Toaster } from "@/components/ui/sonner";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
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
    <html lang="en" className={`${manrope.variable} h-full antialiased dark`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <NextTopLoader color="#F1C67C" showSpinner={false} />
        <LayoutsClient>{children}</LayoutsClient>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
