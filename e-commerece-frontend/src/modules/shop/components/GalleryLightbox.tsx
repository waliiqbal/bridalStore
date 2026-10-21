"use client";

import { useEffect } from "react";
import Image from "next/image";
import { LuChevronLeft, LuChevronRight, LuX } from "react-icons/lu";

interface GalleryImage {
  url: string;
  altText: string | null;
}

// The full-screen photo viewer, with the keyboard (← → Esc). It lives in its own file so its
// code is only downloaded when someone opens it (see ProductGallery).
export default function GalleryLightbox({
  images,
  index,
  onIndexChange,
  name,
  onClose,
}: {
  images: GalleryImage[];
  index: number;
  onIndexChange: (index: number) => void;
  name: string;
  onClose: () => void;
}) {
  const count = images.length;
  const current = images[index] ?? images[0];
  const label = current.altText ?? name;
  const go = (step: number) => onIndexChange((index + step + count) % count);

  // Keyboard control, and no scrolling of the page behind it
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
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
  }, [index, count, onIndexChange, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name}: photos`}
      className="fixed inset-0 z-[60] bg-black/95"
    >
      <button
        type="button"
        aria-label="Close photos"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <LuX className="h-6 w-6" />
      </button>
      <div className="absolute inset-0 p-4 sm:p-10" onClick={onClose}>
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
  );
}
