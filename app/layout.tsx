import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { OrganizationJsonLd } from "next-seo";
import NextTopLoader from "nextjs-toploader";
import { headers } from "next/headers";
import "./globals.css";
import LayoutsClient from "@/components/layouts_client";
import { Toaster } from "@/components/ui/sonner";
import { siteDescription, siteName, siteUrl } from "@/lib/seo";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: ["Blockland", "Solana", "digital land", "coordinate units", "NFT"],
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/img/icon.png",
    apple: "/img/icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName,
    title: siteName,
    description: siteDescription,
    images: [
      {
        url: "/img/meta.png",
        alt: "Blockland coordinate economy map",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: ["/img/meta.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Detect mobile from the user-agent on the server so the scroll-mode is
  // correct on the FIRST render (no flash / black screen on mobile refresh).
  const hdrs = await headers();
  const ua = hdrs.get("user-agent") ?? "";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased dark`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <OrganizationJsonLd
          name={siteName}
          url={siteUrl}
          logo={`${siteUrl}/img/logo_white.png`}
          description={siteDescription}
        />
        <NextTopLoader color="#F1C67C" showSpinner={false} />
        <LayoutsClient initialIsMobile={isMobile}>{children}</LayoutsClient>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
