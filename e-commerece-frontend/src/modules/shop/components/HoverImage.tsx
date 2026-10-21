"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

// The second photo that fades in when you hover a product card. It is only downloaded once
// someone actually points at (or tabs to) the card, so a page of 24 products doesn't fetch 24
// photos nobody looks at, and phones (no hovering) never fetch them at all.
export function HoverImage({ src, sizes }: { src: string; sizes: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  const [wanted, setWanted] = useState(false);

  useEffect(() => {
    const card = marker.current?.closest("a");
    if (!card) return;
    const want = () => setWanted(true);
    card.addEventListener("pointerenter", want, { once: true });
    card.addEventListener("focus", want, { once: true });
    return () => {
      card.removeEventListener("pointerenter", want);
      card.removeEventListener("focus", want);
    };
  }, []);

  return (
    <span ref={marker} className="contents">
      {wanted && (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      )}
    </span>
  );
}
