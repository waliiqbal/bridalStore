"use client";

import { useEffect, useRef, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuVolume2, LuVolumeX } from "react-icons/lu";
import { focusStyle, imageSrc } from "@/shared/lib/image-focus";
import { MenuLink } from "@/shared/layouts/MenuLink";
import type { PublicSection } from "../../types/page";
import { SectionHeader } from "./SectionHeader";

// How far each card sits from the middle one, as a share of a card's width, and how small it is.
// The side cards overlap behind their neighbour, like a fanned-out stack.
const OFFSET_FIRST = 0.59;
const OFFSET_NEXT = 0.49;
const SCALES = [1, 0.9, 0.8];

// How far card `index` is from the middle card, going the shortest way round a circle: after the last card
// comes the first one again, so the row never runs out.
function distanceFrom(active: number, index: number, count: number) {
  const half = Math.floor(count / 2);
  return ((((index - active + half) % count) + count) % count) - half;
}

// The "Trending videos" block: a row of tall videos (up to 50), five on show at a time. The one in the middle is biggest and
// plays, the others are smaller and tucked behind it; the arrows (or a swipe, or a tap on a side card)
// bring the next one to the middle. A video with a link shows a "View" button and opens it when tapped.
export function VideoShowcase({ section }: { section: PublicSection }) {
  const videos = section.videos ?? [];
  const [active, setActive] = useState(() => Math.floor((videos.length - 1) / 2));
  const [muted, setMuted] = useState(true);
  const [onScreen, setOnScreen] = useState(true);
  const root = useRef<HTMLElement>(null);
  const players = useRef<(HTMLVideoElement | null)[]>([]);
  const swipeStart = useRef<number | null>(null);
  // Where the middle card was before the last move, to spot a card that jumps from one end to the other
  const [moved, setMoved] = useState({ active, before: active });
  if (moved.active !== active) setMoved({ active, before: moved.active });

  // Only the middle video plays, and only while the block is on screen
  useEffect(() => {
    players.current.forEach((player, index) => {
      if (!player) return;
      if (index === active && onScreen) void player.play().catch(() => undefined);
      else player.pause();
    });
  }, [active, onScreen]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (videos.length === 0) return null;

  // Jump to one card
  const go = (index: number) => setActive(Math.min(videos.length - 1, Math.max(0, index)));
  // The arrows and a swipe keep going round: after the last video comes the first again
  const step = (by: number) => setActive((current) => (current + by + videos.length) % videos.length);
  const arrow =
    "absolute top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/75 disabled:opacity-30 disabled:hover:bg-black/50";

  return (
    <section
      ref={root}
      aria-roledescription="carousel"
      aria-label={section.title ?? "Trending videos"}
      className="mx-auto w-full max-w-[1600px] px-4 lg:px-6"
    >
      <SectionHeader title={section.title} subtitle={section.subtitle} center />

      {/* --w is the width of the middle card; the height follows (9 : 16) */}
      <div
        className="relative mx-auto h-[calc(var(--w)*16/9+2.5rem)] overflow-hidden [--w:56vw] sm:[--w:14rem] lg:[--w:15rem]"
        onTouchStart={(event) => {
          swipeStart.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const from = swipeStart.current;
          swipeStart.current = null;
          const to = event.changedTouches[0]?.clientX;
          if (from === null || to === undefined || Math.abs(to - from) < 40) return;
          step(to < from ? 1 : -1);
        }}
      >
        <ul className="relative h-full">
          {videos.map((video, index) => {
            const distance = distanceFrom(active, index, videos.length);
            // A card that wraps round from one end to the other should appear there, not fly across the others
            const jumped = Math.abs(distance - distanceFrom(moved.before, index, videos.length)) > 1;
            const away = Math.abs(distance);
            const isActive = away === 0;
            const shift = isActive ? 0 : Math.sign(distance) * (OFFSET_FIRST + OFFSET_NEXT * (away - 1));
            const scale = SCALES[away] ?? SCALES[SCALES.length - 1];
            return (
              <li
                key={video.id}
                aria-label={`${index + 1} of ${videos.length}`}
                aria-hidden={away > 2}
                style={{
                  transform: `translateX(calc(-50% + ${shift} * var(--w))) scale(${scale})`,
                  zIndex: 10 - away,
                  opacity: away > 2 ? 0 : isActive ? 1 : 0.85,
                }}
                className={`absolute left-1/2 top-5 w-[var(--w)] ${
                  jumped ? "transition-none" : "transition-all duration-500 ease-out"
                } ${away > 2 ? "pointer-events-none" : ""}`}
              >
                <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-cream shadow-md">
                  <video
                    ref={(element) => {
                      players.current[index] = element;
                    }}
                    src={imageSrc(video.videoUrl)}
                    poster={imageSrc(video.posterUrl)}
                    style={focusStyle(video.videoUrl)}
                    aria-label={video.title ?? "Video"}
                    muted={muted}
                    loop
                    playsInline
                    // Cards far from the middle are hidden, so they do not download until they come near
                    preload={away <= 2 ? "metadata" : "none"}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
                  />

                  {isActive && (
                    <div className="absolute inset-x-3 bottom-3 space-y-2">
                      {video.title && <p className="truncate text-[15px] text-white">{video.title}</p>}
                      {video.linkUrl && (
                        <span className="block bg-black py-2.5 text-center text-sm font-medium text-white underline underline-offset-4">
                          View
                        </span>
                      )}
                    </div>
                  )}

                  {isActive && video.linkUrl && (
                    <MenuLink href={video.linkUrl} aria-label={video.title ?? "View"} className="absolute inset-0">
                      <span className="sr-only">{video.title ?? "View"}</span>
                    </MenuLink>
                  )}
                  {/* A side card: tapping it brings it to the middle */}
                  {!isActive && away <= 2 && (
                    <button
                      type="button"
                      onClick={() => go(index)}
                      aria-label={`Show video ${index + 1}`}
                      className="absolute inset-0"
                    />
                  )}
                  {isActive && (
                    <button
                      type="button"
                      onClick={() => setMuted((current) => !current)}
                      aria-label={muted ? "Turn sound on" : "Turn sound off"}
                      className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
                    >
                      {muted ? <LuVolumeX className="h-4 w-4" /> : <LuVolume2 className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {videos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous video"
              onClick={() => step(-1)}
              className={`${arrow} left-[max(0.25rem,calc(50%-1.55*var(--w)))]`}
            >
              <LuChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Next video"
              onClick={() => step(1)}
              className={`${arrow} right-[max(0.25rem,calc(50%-1.55*var(--w)))]`}
            >
              <LuChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
