"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Header from "./header";
import Footer from "./footer";
import PrivyProviderWrapper from "./privy-provider";
import { motion, useScroll, useSpring, useTransform, AnimatePresence } from "framer-motion";
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
  // const useNativeScroll = pathname === "/" || pathname === "/message";
  const useNativeScroll = pathname === "/message";

  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // Simulated smooth loading percentage
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const updateProgress = () => {
      setProgress((prev) => {
        if (prev >= 100) {
          setTimeout(() => {
            setIsLoading(false);
          }, 1200); // Pause at 100% for a dramatic effect (2x slower)
          return 100;
        }

        let diff = 0;
        let nextDelay = 0;

        if (prev < 40) {
          // Fast startup (2x slower delay)
          diff = Math.random() * 8 + 5;
          nextDelay = (Math.random() * 60 + 40) * 2;
        } else if (prev < 80) {
          // Normal speed (2x slower delay)
          diff = Math.random() * 5 + 2;
          nextDelay = (Math.random() * 100 + 60) * 2;
        } else if (prev < 95) {
          // Slowing down (2x slower delay)
          diff = Math.random() * 3 + 1;
          nextDelay = (Math.random() * 150 + 100) * 2;
        } else {
          // Creeping to the finish line (2x slower delay)
          diff = Math.random() * 1.5 + 0.5;
          nextDelay = (Math.random() * 200 + 150) * 2;
        }

        const next = Math.min(prev + diff, 100);
        timer = setTimeout(updateProgress, nextDelay);

        return next;
      });
    };

    timer = setTimeout(updateProgress, 200);

    return () => clearTimeout(timer);
  }, []);

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
      {/* Modern Loader Screen */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black text-white"
          >
            {/* Background Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-4 divide-x divide-zinc-900 pointer-events-none z-0 w-full h-screen">
              <div className="h-full" />
              <div className="h-full" />
              <div className="h-full" />
              <div className="h-full" />
            </div>

            {/* Center Rounded Box with SVG Border Progress */}
            <div className="relative flex items-center justify-center w-[180px] h-[180px] z-10">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                {/* Background Track */}
                <circle
                  cx="90"
                  cy="90"
                  r="80"
                  className="stroke-zinc-900 fill-none"
                  strokeWidth="1"
                />
                {/* Active Progress Border */}
                <motion.circle
                  cx="90"
                  cy="90"
                  r="80"
                  className="stroke-white fill-none"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeDasharray="503" // Circumference for r=80 (2 * pi * 80 ~ 503)
                  initial={{ strokeDashoffset: 503 }}
                  animate={{ strokeDashoffset: 503 - (503 * progress) / 100 }}
                  transition={{ ease: "easeOut", duration: 0.1 }}
                />
              </svg>

              {/* Percentage & Loading text */}
              <div className="flex flex-col items-center justify-center z-10 select-none">
                <span className="text-3xl font-extrabold text-white">
                  {Math.round(progress)}%
                </span>
                <span className="text-[10px] text-white mt-1 font-semibold uppercase tracking-[0.25em]">
                  Loading
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smooth scroll container (or native-scroll wrapper on GSAP pages) */}
      <motion.div
        ref={contentRef}
        style={useNativeScroll ? undefined : { y: springY }}
        {...(useNativeScroll
          ? {}
          : {
              initial: { opacity: 0, filter: "blur(12px)", scale: 1.02 },
              animate: {
                opacity: isLoading ? 0 : 1,
                filter: isLoading ? "blur(12px)" : "blur(0px)",
                scale: isLoading ? 1.02 : 1,
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
        <div style={{ height: isLoading ? "100vh" : contentHeight }} className="w-full pointer-events-none" />
      )}

      <ProfileDialogWatcher />
    </PrivyProviderWrapper>
  );
}
