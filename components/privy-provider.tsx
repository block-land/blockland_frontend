"use client";

import React from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";

// Solana external-wallet connectors (Phantom, Solflare, Backpack, ...)
const solanaConnectors = toSolanaWalletConnectors();

/**
 * Wraps the app with Privy configured for Solana external wallets only.
 *
 * - The active Solana cluster (devnet/mainnet) is chosen by the connected wallet
 *   (e.g. Phantom's network selector), not by this config.
 * - The embedded Solana wallet is disabled (createOnLogin: "off") since we only
 *   connect external wallets like Phantom, Solflare, and Backpack.
 */
export default function PrivyProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? ""}
      config={{
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
        embeddedWallets: {
          solana: {
            createOnLogin: "off",
          },
        },
        appearance: {
          theme: "#0A0A0A",
          accentColor: "#F1C67C",
          // This app is external-wallet-only (no email/sms/social logins), so
          // the wallet picker must show first. Setting this explicitly signals
          // intent and silences Privy's "you should only disable
          // showWalletLoginFirst when other logins are enabled" warning — here
          // wallet-first is the intended, only flow.
          showWalletLoginFirst: true,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
