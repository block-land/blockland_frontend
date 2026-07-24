import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { OrganizationJsonLd } from "next-seo";
import NextTopLoader from "nextjs-toploader";
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
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName,
    title: siteName,
    description: siteDescription,
    images: [
      {
        url: "/img/hero-1.png",
        alt: "Blockland coordinate economy map",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: ["/img/hero-1.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <LayoutsClient>{children}</LayoutsClient>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
