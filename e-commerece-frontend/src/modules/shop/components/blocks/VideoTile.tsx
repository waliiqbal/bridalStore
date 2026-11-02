"use client";

import { useEffect, useRef, useState } from "react";
import { LuVolume2, LuVolumeX } from "react-icons/lu";
import { focusStyle, imageSrc } from "@/shared/lib/image-focus";
import { MenuLink } from "@/shared/layouts/MenuLink";
import type { PublicVideo } from "../../types/page";

// One homepage video. It plays silently while it is on screen and pauses when it scrolls away,
// so several videos never play at once. The speaker button turns the sound on.
export function VideoTile({ video }: { video: PublicVideo }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => undefined);
        else el.pause();
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    // Same shape as the top banners (HeroSlider)
    <div className="relative aspect-[4/5] overflow-hidden bg-cream sm:aspect-[16/9] lg:aspect-[8/3]">
      <video
        ref={ref}
        src={imageSrc(video.videoUrl)}
        style={focusStyle(video.videoUrl)}
        poster={imageSrc(video.posterUrl)}
        aria-label={video.title ?? "Video"}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* A video the owner linked to a product (or page): tapping it opens that page */}
      {video.linkUrl && (
        <MenuLink href={video.linkUrl} aria-label={video.title ?? "Shop this video"} className="absolute inset-0">
          <span className="absolute bottom-3 left-3 bg-white px-4 py-2 text-xs font-medium uppercase tracking-wider text-black shadow">
            Shop now
          </span>
        </MenuLink>
      )}
      <button
        type="button"
        onClick={() => setMuted((current) => !current)}
        aria-label={muted ? "Turn sound on" : "Turn sound off"}
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
      >
        {muted ? <LuVolumeX className="h-5 w-5" /> : <LuVolume2 className="h-5 w-5" />}
      </button>
    </div>
  );
}
