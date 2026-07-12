import Link from "next/link";
import { FaInstagram, FaLinkedin, FaGithub, FaTelegram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { withCustomButton } from "./custom/button_custom";
import { IconDexscreener } from "@/lib/icon";

const CustomButton = withCustomButton("button");

export default function Footer() {
  return (
    <footer className="w-full bg-black border-t border-zinc-900 text-white font-sans">
      <div className="mx-auto container pt-16 pb-12 flex flex-col gap-12">
        {/* Newsletter Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 pb-12 border-b border-zinc-900">
          <div className="space-y-4 max-w-xl">
            <h2 className="max-w-[400px] text-2xl tracking-tight sm:text-4xl text-white">
              The world first{" "}
              <span className="text-primary">coordinate economy</span>
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* <div>
              <IconDexscreener className="text-4xl"/>
            </div> */}
            <CustomButton>Buy blockland</CustomButton>
          </div>
        </div>

        {/* Links & Info Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 py-4">
          {/* Logo / Tagline */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-12">
            <div className="space-y-4">
              {/* <Link
                href="/"
                className="flex shrink-0 items-center gap-3 text-white transition-opacity hover:opacity-85"
                aria-label="Blockland home"
              >
                <img src="/img/logo_white.png" className="w-[160px]" alt="" />
              </Link> */}
              <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
                Own, trade, and build on Coordinate Units that represent
                real-world locations.
              </p>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-6 text-zinc-400">
              <a href="#" className="hover:text-primary transition-colors">
                <FaXTwitter className="text-2xl" />
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <FaTelegram className="text-2xl" />
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <FaGithub className="text-2xl" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold tracking-wide text-zinc-200">
              Company
            </h3>
            <ul className="space-y-6 text-sm text-zinc-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  News
                </a>
              </li>
              {/* <li>
                <a href="#" className="hover:text-white transition-colors">
                  Carrers
                </a>
              </li> */}
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold tracking-wide text-zinc-200">
              Resources
            </h3>
            <ul className="space-y-6 text-sm text-zinc-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Docs
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Whitepaper
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Media Kit
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Developers
                </a>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-sm font-semibold tracking-wide text-zinc-200">
              Legal
            </h3>
            <ul className="space-y-6 text-sm text-zinc-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Terms of service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Privacy policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Disclaimer
                </a>
              </li>
            </ul>
          </div>

          {/* <div className="lg:col-span-3 space-y-6">
            <h3 className="text-sm font-semibold tracking-wide text-zinc-200">
              Contact
            </h3>

            <div className="space-y-1">
              <div className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                Email Address
              </div>
              <a
                href="mailto:lead@example.com"
                className="text-sm text-zinc-300 hover:text-white transition-colors"
              >
                lead@example.com
              </a>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                Phone Number
              </div>
              <a
                href="tel:+15551234567"
                className="text-sm text-zinc-300 hover:text-white transition-colors"
              >
                +1 (555) 123-4567
              </a>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                Address
              </div>
              <p className="text-sm text-zinc-300">California DRE #01521930</p>
            </div>
          </div> */}
        </div>

        {/* Bottom Credits */}
        <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <div>Copyright © Blockland 2026</div>
          {/* <div>
            Built on{" "}
            <a
              href="#"
              target="_blank"
              className="text-primary border-b border-primary"
            >
              Solana
            </a>
          </div> */}
        </div>
      </div>
    </footer>
  );
}
