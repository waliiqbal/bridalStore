"use client";

import { useRef, useState } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import type { PublicVideo } from "../../types/page";
import { VideoTile } from "./VideoTile";

// The homepage videos, just below the top banners, the same size as a banner. One video shows at a time;
// with more, the row slides sideways (arrows and dots on a computer, swipe on a phone).
export function VideosBlock({ videos }: { videos: PublicVideo[] }) {
  const row = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);

  if (videos.length === 0) return null;

  const goTo = (index: number) => {
    const el = row.current;
    if (el) el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section aria-label="Videos" aria-roledescription="carousel" className="relative">
      <ul
        ref={row}
        onScroll={(event) => {
          const el = event.currentTarget;
          setCurrent(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {videos.map((video) => (
          <li key={video.id} className="w-full shrink-0 snap-center">
            <VideoTile video={video} />
          </li>
        ))}
      </ul>

      {videos.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous video"
            onClick={() => goTo(Math.max(current - 1, 0))}
            className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-black hover:text-white md:flex"
          >
            <LuChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next video"
            onClick={() => goTo(Math.min(current + 1, videos.length - 1))}
            className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-black hover:text-white md:flex"
          >
            <LuChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            {videos.map((video, index) => (
              <button
                key={video.id}
                type="button"
                aria-label={`Show video ${index + 1}`}
                aria-current={index === current}
                onClick={() => goTo(index)}
                className={`h-2 rounded-full transition-all ${index === current ? "w-6 bg-white" : "w-2 bg-white/60"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
