"use client";

import React from "react";
import Link from "next/link";
import { useConnectWallet } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { withCustomButton } from "./custom/button_custom";
import { IconUser } from "../lib/icon";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { RiArrowRightUpLine, RiLogoutCircleRLine } from "react-icons/ri";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { SOLSCAN_CLUSTER_PARAM } from "../lib/solana/constants";
import Avatar from "boring-avatars";

const CustomButton = withCustomButton("button");

/** Shorten a Solana address, e.g. 7xK...wXz */
function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 4)}..${address.slice(-4)}`;
}

export default function WalletButton() {
  const { connectWallet } = useConnectWallet();
  const { wallets } = useWallets();
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  // NOTE: the active Solana cluster (mainnet/devnet) is controlled by the
  // connected wallet, not by Privy. The Solscan link cluster param follows the
  // app's configured cluster (NEXT_PUBLIC_SOLANA_CLUSTER) so the link points at
  // the same network the app reads from.
  const connected = wallets.length > 0;
  const wallet = wallets[0];

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (error) {
      // User rejected / wallet error — the modal handles the UX, keep silent.
      console.error("Failed to connect wallet:", error);
    }
  };

  const handleCopy = async () => {
    if (wallet?.address) {
      await navigator.clipboard.writeText(wallet.address);
    }
  };

  const handleViewOnSolscan = () => {
    if (!wallet?.address) return;
    window.open(
      `https://solscan.io/account/${wallet.address}${SOLSCAN_CLUSTER_PARAM}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleDisconnect = async () => {
    await wallet?.disconnect();
    setIsAlertOpen(false);
  };

  // Not connected yet — show "Connect" trigger button.
  if (!connected || !wallet) {
    return (
      <CustomButton type="button" onClick={handleConnect} icon={IconUser}>
        Connect
      </CustomButton>
    );
  }

  // Connected — show address + popover menu.
  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <CustomButton
            type="button"
            iconBgTransparent
            icon={
              <div className="rounded-xl overflow-hidden isolate">
                <Avatar
                  colors={[
                    "#f5e1a4",
                    "#d9d593",
                    "#ee7f27",
                    "#bc162a",
                    "#302325",
                  ]}
                  variant="pixel"
                  square
                />
              </div>
            }
          >
            <div className="leading-3.5 mt-1">
              <div className="">Account</div>
              <div className="text-[8px] uppercase opacity-50">
                {shortenAddress(wallet.address)}
              </div>
            </div>
            {/* {shortenAddress(wallet.address)} */}
          </CustomButton>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-64 border border-zinc-800 text-white rounded-2xl p-4 space-y-4 shadow-2xl z-50"
        >
          <div className="flex flex-col gap-1.5">
            <Link
              href="/account"
              onClick={() => setIsPopoverOpen(false)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-900 text-sm transition-all text-zinc-300 hover:text-white"
            >
              <span>My Account</span>
              <RiArrowRightUpLine />
            </Link>
            <button
              onClick={() => {
                setIsPopoverOpen(false);
                setIsAlertOpen(true);
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-primary/10 text-sm transition-all text-primary text-left cursor-pointer"
            >
              <span>Logout</span>
              <RiLogoutCircleRLine />
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-zinc-950 border border-zinc-900 text-white max-w-sm rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-white tracking-tight">
              Confirm Logout
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-sm mt-2 leading-relaxed">
              Are you sure you want to disconnect your wallet? You will need to
              reconnect to interact with Blockland coordinate units.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center gap-3 mt-4">
            <AlertDialogCancel className="flex-1 bg-transparent hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white py-3 rounded-xl transition-all cursor-pointer text-sm">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="flex-1 bg-red-500 hover:bg-red-650 text-white font-semibold py-3 rounded-xl transition-all cursor-pointer text-sm"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
