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
  initialIsMobile = false,
}: {
  children: React.ReactNode;
  /** Mobile flag detected from the user-agent on the server. Used as the
   * initial value so SSR and first client render pick the correct scroll path
   * (avoids the black-screen flash on mobile refresh). */
  initialIsMobile?: boolean;
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
  //
  // Detect mobile from the user-agent during SSR so the FIRST render (server +
  // client hydration) already uses the correct scroll path. This prevents the
  // black screen / fixed-container flash that happened when isMobile flipped
  // from false→true after mount on mobile refresh. We keep it reactive on the
  // client via matchMedia for resize/orientation changes.
  // Detect mobile/touch for scroll-mode selection. The initial value comes from
  // the server (user-agent) via the initialIsMobile prop, so SSR and the first
  // client render already agree on the scroll path — no flash / black screen on
  // mobile refresh. We then keep it reactive on the client via matchMedia for
  // resize / orientation changes.
  const [isMobile, setIsMobile] = useState(initialIsMobile);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  const useNativeScroll = pathname === "/message" || isMobile;

  // Header positioning:
  // - Home/landmark on desktop → "absolute" (overlay on top of the hero image)
  // - Home/landmark on mobile  → "fixed" (always pinned to the viewport top
  //   while scrolling, stronger than sticky — needed because the hero page
  //   uses native scroll on mobile and sticky can detach depending on layout)
  // - Other pages              → "sticky" everywhere
  const headerPosition: "absolute" | "fixed" | "sticky" =
    isAbsoluteHeader ? (isMobile ? "fixed" : "absolute") : "sticky";

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

  const isAdmin = pathname === "/login" || pathname.startsWith("/dashboard");
  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <PrivyProviderWrapper>
      {useNativeScroll ? (
        /* Native-scroll wrapper: used on mobile and the message page. No
           framer-motion transform/animation here, so there is no chance of an
           invisible (opacity:0) container stuck during hydration. */
        <motion.div
          ref={contentRef}
          className="relative w-full flex flex-col"
        >
          <div className="relative min-h-screen flex flex-col">
            {/* Header container */}
            <div className={
              headerPosition === "absolute"
                ? "absolute top-0 left-0 right-0 z-50"
                : headerPosition === "fixed"
                  ? "fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-900/50 transition-all shrink-0"
                  : "sticky top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-900/50 transition-all shrink-0"
            }>
              <section className={headerPosition === "absolute" ? "mx-auto flex w-full max-w-[1440px] flex-col px-6 pt-[47px] sm:px-10 lg:px-[68px]" : "mx-auto flex w-full max-w-[1440px] flex-col px-6 py-4 sm:px-10 lg:px-[68px]"}>
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
      ) : (
        /* Smooth-scroll wrapper: desktop only. Fixed + transformed container
           with a blur entrance animation and a height placeholder so the
           native scrollbar reflects the transformed content height. */
        <motion.div
          ref={contentRef}
          style={{ y: springY }}
          initial={{ opacity: 0, filter: "blur(12px)", scale: 1.02 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-0 left-0 w-full overflow-hidden flex flex-col"
        >
          <div className="relative min-h-screen flex flex-col">
            {/* Header container */}
            <div className={
              headerPosition === "absolute"
                ? "absolute top-0 left-0 right-0 z-50"
                : headerPosition === "fixed"
                  ? "fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-900/50 transition-all shrink-0"
                  : "sticky top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-900/50 transition-all shrink-0"
            }>
              <section className={headerPosition === "absolute" ? "mx-auto flex w-full max-w-[1440px] flex-col px-6 pt-[47px] sm:px-10 lg:px-[68px]" : "mx-auto flex w-full max-w-[1440px] flex-col px-6 py-4 sm:px-10 lg:px-[68px]"}>
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
      )}

      {/* Page height placeholder for native scrollbar (smooth-scroll mode only) */}
      {!useNativeScroll && (
        <div style={{ height: contentHeight }} className="w-full pointer-events-none" />
      )}

      <ProfileDialogWatcher />
    </PrivyProviderWrapper>
  );
}
