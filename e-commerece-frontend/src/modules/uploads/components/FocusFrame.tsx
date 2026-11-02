"use client";

import { useRef, useState } from "react";
import { imageSrc, parseFocus, withFocus, type Focus } from "@/shared/lib/image-focus";

const clamp = (value: number) => Math.min(100, Math.max(0, value));

// A picture or video shown in the same shape as its box on the website. Drag it to choose which part
// is shown (like moving a Facebook cover photo); the choice is saved in the address (see image-focus.ts).
export function FocusFrame({
  value,
  kind,
  aspect,
  alt = "",
  onChange,
  onSize,
}: {
  // The stored address, with the saved position at the end
  value: string;
  kind: "image" | "video";
  // Shape of the box on the website (width / height)
  aspect: number;
  alt?: string;
  onChange: (url: string) => void;
  // Called with the real width of the picture or video once it has loaded
  onSize?: (width: number) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const natural = useRef({ width: 0, height: 0 });
  // The position while dragging; saved when the owner lets go
  const [dragging, setDragging] = useState<Focus | null>(null);
  const start = useRef<{ x: number; y: number; focus: Focus } | null>(null);

  const clean = imageSrc(value);
  const saved = parseFocus(value);
  const focus = dragging ?? saved;
  const tall = aspect < 1;

  // How far the media overhangs the box on each side (it is scaled to just cover the box)
  function overhang() {
    const box = frame.current?.getBoundingClientRect();
    const { width, height } = natural.current;
    if (!box || !width || !height) return { x: 0, y: 0 };
    const scale = Math.max(box.width / width, box.height / height);
    return { x: Math.max(0, width * scale - box.width), y: Math.max(0, height * scale - box.height) };
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { x: event.clientX, y: event.clientY, focus: saved };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const from = start.current;
    if (!from) return;
    const over = overhang();
    // Dragging to the right shows more of the left side
    setDragging({
      x: over.x > 0.5 ? clamp(from.focus.x - ((event.clientX - from.x) * 100) / over.x) : from.focus.x,
      y: over.y > 0.5 ? clamp(from.focus.y - ((event.clientY - from.y) * 100) / over.y) : from.focus.y,
    });
  }

  function onPointerUp() {
    start.current = null;
    if (dragging) onChange(withFocus(clean, dragging));
    setDragging(null);
  }

  const shared = {
    className: "h-full w-full select-none object-cover",
    style: { objectPosition: `${focus.x}% ${focus.y}%` },
    draggable: false,
  } as const;

  return (
    <div
      ref={frame}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative w-full cursor-grab touch-none select-none overflow-hidden rounded-sm border border-line bg-cream active:cursor-grabbing"
      style={{ aspectRatio: aspect, maxWidth: tall ? 200 : 360 }}
    >
      {kind === "image" ? (
        // A plain <img>: it is a preview of the stored file, and we read its real size when it loads
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={clean}
          alt={alt}
          {...shared}
          onLoad={(event) => {
            const img = event.currentTarget;
            natural.current = { width: img.naturalWidth, height: img.naturalHeight };
            onSize?.(img.naturalWidth);
          }}
        />
      ) : (
        <video
          src={clean}
          aria-label={alt || "Video preview"}
          muted
          loop
          autoPlay
          playsInline
          {...shared}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            natural.current = { width: video.videoWidth, height: video.videoHeight };
            onSize?.(video.videoWidth);
          }}
        />
      )}
    </div>
  );
}
