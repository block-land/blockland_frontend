"use client";

import React, { useEffect, useRef } from "react";
import videojs from "video.js";
import Player from "video.js/dist/video-js.css";

// Import CSS Video.js directly
import "video.js/dist/video-js.css";

interface VideoPlayerProps {
  options: any;
  onReady?: (player: any) => void;
}

export default function VideoPlayer({ options, onReady }: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      // The Video.js player needs a video element and its parent
      const videoElement = document.createElement("video-js");

      videoElement.classList.add("vjs-big-play-centered");
      videoElement.classList.add("vjs-theme-forest"); // Custom looking skin
      if (videoRef.current) {
        videoRef.current.appendChild(videoElement);
      }

      const player = (playerRef.current = videojs(videoElement, options, () => {
        onReady && onReady(player);
      }));

      // Set styles to fit container
      player.width("100%");
      player.height("100%");
    } else {
      const player = playerRef.current;

      player.autoplay(options.autoplay);
      player.src(options.sources);
    }
  }, [options, videoRef]);

  // Dispose player on unmount
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div data-vjs-player className="w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-zinc-800">
      <div ref={videoRef} className="w-full h-full" />
    </div>
  );
}
