"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Header from "./header";
import Footer from "./footer";
import PrivyProviderWrapper from "./privy-provider";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import ProfileDialogWatcher from "./profile-dialog-watcher";

export default function LayoutsClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showFooter = pathname !== "/landmark" && pathname !== "/message";
  const isAbsoluteHeader = pathname === "/" || pathname === "/landmark";

  // Home page uses GSAP ScrollTrigger pin, which is incompatible with the
  // custom smooth-scroll (fixed + transformed container). Bypass smooth-scroll
  // and use native browser scroll there so pin math stays correct.
  // Also bypass smooth-scroll for the message page to ensure viewport heights and fixed flex boxes work properly.
  // Also bypass smooth-scroll on mobile/touch devices — the fixed+transformed
  // container fights with native touch scrolling and feels janky.
  // const useNativeScroll = pathname === "/" || pathname === "/message";
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  const useNativeScroll = pathname === "/message" || isMobile;

  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (!contentRef.current) return;

    const handleResize = () => {
      if (contentRef.current) {
        setContentHeight(contentRef.current.getBoundingClientRect().height);
      }
    };

    // Run initial height check
    handleResize();

    // Create ResizeObserver to monitor content height changes
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(contentRef.current);

    // Watch window resizing
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [pathname, children]);

  // Framer Motion Scroll & Spring setup
  const { scrollY } = useScroll();
  const transformY = useTransform(scrollY, (value) => -value);
  const springY = useSpring(transformY, {
    damping: 15,
    stiffness: 100,
    mass: 0.1,
    restDelta: 0.001,
  });

  return (
    <PrivyProviderWrapper>
      {/* Smooth scroll container (or native-scroll wrapper on GSAP pages) */}
      <motion.div
        ref={contentRef}
        style={useNativeScroll ? undefined : { y: springY }}
        {...(useNativeScroll
          ? {}
          : {
              initial: { opacity: 0, filter: "blur(12px)", scale: 1.02 },
              animate: {
                opacity: 1,
                filter: "blur(0px)",
                scale: 1,
              },
              transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
            })}
        className={
          useNativeScroll
            ? "relative w-full flex flex-col"
            : "fixed top-0 left-0 w-full overflow-hidden flex flex-col"
        }
      >
        <div className="relative min-h-screen flex flex-col">
          {/* Header container */}
          <div className={isAbsoluteHeader ? "absolute top-0 left-0 right-0 z-50" : "sticky top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-900/50 transition-all shrink-0"}>
            <section className={isAbsoluteHeader ? "mx-auto flex w-full max-w-[1440px] flex-col px-6 pt-[47px] sm:px-10 lg:px-[68px]" : "mx-auto flex w-full max-w-[1440px] flex-col px-6 py-4 sm:px-10 lg:px-[68px]"}>
              <Header />
            </section>
          </div>

          {/* Main content wrapper */}
          <div className="flex-1 flex flex-col">
            {children}
          </div>

          {/* Footer */}
          {showFooter && <Footer />}
        </div>
      </motion.div>

      {/* Page height placeholder for native scrollbar (smooth-scroll mode only) */}
      {!useNativeScroll && (
        <div style={{ height: contentHeight }} className="w-full pointer-events-none" />
      )}

      <ProfileDialogWatcher />
    </PrivyProviderWrapper>
  );
}
