"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LuChevronLeft, LuChevronRight, LuX, LuZoomIn } from "react-icons/lu";

interface GalleryImage {
  url: string;
  altText: string | null;
}

// The product photos: a big picture that zooms under the mouse, thumbnails, arrows and swipe,
// and a full-screen view with the keyboard (← → Esc). The page decides which photo is showing.
export function ProductGallery({
  images,
  index,
  onIndexChange,
  name,
}: {
  images: GalleryImage[];
  index: number;
  onIndexChange: (index: number) => void;
  name: string;
}) {
  const [zoomAt, setZoomAt] = useState<{ x: number; y: number } | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const swipeStart = useRef<number | null>(null);
  const count = images.length;

  const go = (step: number) => onIndexChange((index + step + count) % count);

  // Full-screen view: keyboard control, and no scrolling of the page behind it
  useEffect(() => {
    if (!fullScreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullScreen(false);
      if (event.key === "ArrowLeft") onIndexChange((index - 1 + count) % count);
      if (event.key === "ArrowRight") onIndexChange((index + 1) % count);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [fullScreen, index, count, onIndexChange]);

  if (count === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center bg-cream text-sm text-muted">
        Photos coming soon
      </div>
    );
  }

  const current = images[index] ?? images[0];
  const label = current.altText ?? name;

  return (
    <div className="grid gap-3 md:grid-cols-[4.5rem_minmax(0,1fr)]">
      {count > 1 && (
        <ul className="order-2 flex gap-2 overflow-x-auto md:order-1 md:max-h-[40rem] md:flex-col md:overflow-y-auto">
          {images.map((image, i) => (
            <li key={`${image.url}-${i}`} className="shrink-0">
              <button
                type="button"
                onClick={() => onIndexChange(i)}
                aria-label={`Show photo ${i + 1} of ${count}`}
                aria-current={i === index}
                className={`relative block h-24 w-[4.5rem] overflow-hidden bg-cream md:h-24 ${
                  i === index ? "ring-2 ring-black" : "opacity-70 ring-1 ring-line hover:opacity-100"
                }`}
              >
                <Image src={image.url} alt="" fill sizes="72px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="order-1 md:order-2">
        <div
          className="group relative aspect-[3/4] cursor-zoom-in overflow-hidden bg-cream"
          onClick={() => setFullScreen(true)}
          onPointerMove={(event) => {
            if (event.pointerType !== "mouse") return;
            const box = event.currentTarget.getBoundingClientRect();
            setZoomAt({
              x: ((event.clientX - box.left) / box.width) * 100,
              y: ((event.clientY - box.top) / box.height) * 100,
            });
          }}
          onPointerLeave={() => setZoomAt(null)}
          onTouchStart={(event) => {
            swipeStart.current = event.touches[0].clientX;
          }}
          onTouchEnd={(event) => {
            if (swipeStart.current === null || count < 2) return;
            const moved = event.changedTouches[0].clientX - swipeStart.current;
            swipeStart.current = null;
            if (Math.abs(moved) > 50) go(moved < 0 ? 1 : -1);
          }}
        >
          <Image
            key={current.url}
            src={current.url}
            alt={label}
            fill
            priority
            sizes="(min-width: 1024px) 45vw, (min-width: 768px) 55vw, 100vw"
            className="object-cover transition-transform duration-200 ease-out"
            style={{
              transform: zoomAt ? "scale(2)" : "scale(1)",
              transformOrigin: zoomAt ? `${zoomAt.x}% ${zoomAt.y}%` : "center",
            }}
          />

          <span className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 opacity-0 transition group-hover:opacity-100">
            <LuZoomIn className="h-4 w-4" aria-hidden />
          </span>

          {count > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(event) => {
                  event.stopPropagation();
                  go(-1);
                }}
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow md:opacity-0 md:transition md:group-hover:opacity-100"
              >
                <LuChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(event) => {
                  event.stopPropagation();
                  go(1);
                }}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow md:opacity-0 md:transition md:group-hover:opacity-100"
              >
                <LuChevronRight className="h-5 w-5" />
              </button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-0.5 text-xs text-white md:hidden">
                {index + 1} / {count}
              </span>
            </>
          )}
        </div>
      </div>

      {fullScreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name}: photos`}
          className="fixed inset-0 z-[60] bg-black/95"
        >
          <button
            type="button"
            aria-label="Close photos"
            onClick={() => setFullScreen(false)}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <LuX className="h-6 w-6" />
          </button>
          <div className="absolute inset-0 p-4 sm:p-10" onClick={() => setFullScreen(false)}>
            <div className="relative h-full w-full">
              <Image src={current.url} alt={label} fill sizes="100vw" className="object-contain" />
            </div>
          </div>
          {count > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => go(-1)}
                className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <LuChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => go(1)}
                className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <LuChevronRight className="h-6 w-6" />
              </button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">
                {index + 1} / {count}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
