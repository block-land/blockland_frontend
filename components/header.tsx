import Link from "next/link";
import WalletButton from "./wallet-button";
import { MessageSquare } from "lucide-react";

const navItems = [
  { label: "About us", href: "/about" },
  { label: "Landmark", href: "/landmark" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "News", href: "/news" },
  { label: "Message", href: "/message" },
];

export default function Header() {
  return (
    <header
      className="flex w-full items-center justify-between gap-8"
      data-name="Header"
      data-node-id="12:283"
    >
      <Link
        href="/"
        className="flex shrink-0 items-center gap-3 text-white transition-opacity hover:opacity-85"
        aria-label="Blockland home"
      >
        <img src="/img/logo_white.png" className="w-[160px]" alt="" />
      </Link>

      <nav
        aria-label="Primary"
        // className="hidden lg:flex flex-1 justify-center"
        className="hidden lg:flex flex-1 justify-center"
      >
        <ul className="flex flex-wrap items-center justify-center gap-x-[67px] gap-y-4 text-[16px] text-white">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex items-center gap-4 shrink-0">
        {/* <Link
          href="/message"
          className="relative flex items-center justify-center h-[42px] w-[42px] rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-primary hover:border-zinc-700 transition-colors"
          title="Messages"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white ring-2 ring-black">
            2
          </span>
        </Link> */}
        <WalletButton />
      </div>
    </header>
  );
}
