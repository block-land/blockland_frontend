"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "./wallet-button";
import { Menu, X } from "lucide-react";
import gsap from "gsap";

const navItems = [
  { label: "Landmark", href: "/landmark" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "News", href: "/news" },
  { label: "Message", href: "/message" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const navListRef = useRef<HTMLUListElement>(null);
  const scopeRef = useRef<HTMLDivElement>(null);

  // Close the mobile menu whenever the route changes.
  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile menu is open so the background can't
  // scroll (which would hide the close/hamburger button behind the overlay).
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // GSAP animation for the mobile menu open/close.
  useEffect(() => {
    const scope = scopeRef.current;
    const menu = menuRef.current;
    const navList = navListRef.current;
    if (!scope || !menu || !navList) return;

    const ctx = gsap.context(() => {
      if (isOpen) {
        // Open: slide the panel down + fade in nav items with a stagger.
        gsap.set(menu, { display: "flex", visibility: "visible" });
        gsap.fromTo(
          menu,
          { autoAlpha: 0, y: -16 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.4,
            ease: "power3.out",
          },
        );
        gsap.fromTo(
          navList.children,
          { autoAlpha: 0, y: -12 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.35,
            ease: "power2.out",
            stagger: 0.06,
            delay: 0.05,
          },
        );
      } else {
        // Close: reverse the panel animation, then fully hide it so it cannot
        // linger as a black overlay (which caused the mobile refresh black
        // screen). Set display:none immediately to be safe.
        gsap.to(menu, {
          autoAlpha: 0,
          y: -16,
          duration: 0.25,
          ease: "power2.in",
          onComplete: () =>
            gsap.set(menu, { display: "none", visibility: "hidden" }),
        });
      }
    }, scopeRef);

    return () => ctx.revert();
  }, [isOpen]);

  return (
    <div ref={scopeRef} className="w-full">
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

        {/* Desktop nav */}
        <nav
          aria-label="Primary"
          className="hidden lg:flex flex-1 justify-center"
        >
          <ul className="flex flex-wrap items-center justify-center gap-x-[67px] gap-y-4 text-[16px] text-white">
            {navItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none ${
                    pathname.startsWith(item.href) ? "text-primary" : ""
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4 shrink-0">
          <WalletButton />
          {/* Hamburger toggle — only on mobile/tablet */}
          <button
            type="button"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
            className="lg:hidden relative z-[210] flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-white hover:border-zinc-700 hover:text-primary transition-colors"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile nav menu — full-screen overlay (GSAP animated). It is kept
          hidden by default via inline styles so it can NEVER flash on screen
          during a refresh / before GSAP runs. GSAP only animates open/close. */}
      <div
        ref={menuRef}
        aria-hidden={!isOpen}
        style={{ display: "none", opacity: 0, visibility: "hidden" }}
        className="lg:hidden fixed inset-0 z-[200] h-screen w-screen flex-col bg-black/95 backdrop-blur-md text-white"
      >
        <ul ref={navListRef} className="flex flex-col gap-2 px-6 pt-28">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`block rounded-xl px-4 py-4 text-2xl font-semibold transition-colors hover:bg-zinc-900 hover:text-primary focus-visible:bg-zinc-900 focus-visible:text-primary focus-visible:outline-none ${
                  pathname.startsWith(item.href) ? "text-primary" : ""
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
