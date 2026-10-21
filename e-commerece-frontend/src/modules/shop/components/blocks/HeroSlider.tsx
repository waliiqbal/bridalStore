"use client";

import { useEffect, useState } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { ArtDirectedImage } from "@/shared/components/ArtDirectedImage";
import { MenuLink } from "@/shared/layouts/MenuLink";

export interface HeroSlide {
  id: string;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  // A taller picture for phones; if missing the main picture is used
  mobileImageUrl?: string | null;
  linkUrl?: string | null;
  buttonText?: string | null;
  align?: "left" | "center" | "right";
  // "light" = white words (for dark pictures), "dark" = dark words (for light pictures)
  tone?: "light" | "dark";
}

const ROTATE_MS = 6500;
// The next slide's picture starts downloading this long after the current one appears, so the
// first picture (the biggest thing on the page) never has to share the connection.
const PRELOAD_NEXT_MS = 2500;

// The big picture(s) at the top of the homepage. One slide stays still; several slide on their own
// every few seconds (paused while you point at it, and never moving for people who asked their
// device to reduce motion), with arrows and dots.
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Slides whose pictures have been added to the page. Only the first one at the start.
  const [loaded, setLoaded] = useState<ReadonlySet<number>>(() => new Set([0]));
  const many = slides.length > 1;

  // Whatever slide is showing must have its picture
  if (!loaded.has(index)) setLoaded(new Set(loaded).add(index));

  useEffect(() => {
    if (!many) return;
    const next = (index + 1) % slides.length;
    const timer = setTimeout(() => setLoaded((current) => new Set(current).add(next)), PRELOAD_NEXT_MS);
    return () => clearTimeout(timer);
  }, [index, many, slides.length]);

  useEffect(() => {
    if (!many || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [many, paused, slides.length]);

  if (slides.length === 0) return null;
  const go = (step: number) => setIndex((i) => (i + step + slides.length) % slides.length);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative overflow-hidden bg-cream"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative aspect-[4/5] sm:aspect-[16/9] lg:aspect-[1920/760]">
        {slides.map((slide, i) => {
          const active = i === index;
          const align = slide.align ?? "left";
          const light = (slide.tone ?? "light") === "light";
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
              // `inert` takes hidden slides out of the tab order and away from screen readers
              inert={!active}
              className={`absolute inset-0 ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              {loaded.has(i) && (
                <ArtDirectedImage
                  desktopSrc={slide.imageUrl}
                  mobileSrc={slide.mobileImageUrl}
                  breakpoint={640}
                  eager={i === 0}
                  className="object-cover"
                />
              )}

              <div
                aria-hidden
                className={`absolute inset-0 ${
                  light
                    ? "bg-gradient-to-t from-black/55 via-black/10 to-transparent sm:bg-gradient-to-r sm:from-black/45 sm:via-transparent sm:to-transparent"
                    : "bg-gradient-to-t from-white/70 via-transparent to-transparent"
                } ${align === "right" ? "sm:bg-gradient-to-l" : ""}`}
              />

              <div
                className={`absolute inset-0 flex items-end px-6 pb-12 sm:items-center sm:px-14 sm:pb-0 lg:px-24 ${
                  align === "center"
                    ? "justify-center text-center"
                    : align === "right"
                      ? "justify-end text-right"
                      : ""
                }`}
              >
                <div className={`max-w-xl ${light ? "text-white" : "text-foreground"}`}>
                  {slide.title && (
                    <h2 className="font-serif text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                      {slide.title}
                    </h2>
                  )}
                  {slide.subtitle && <p className="mt-3 text-base sm:text-lg">{slide.subtitle}</p>}
                  {slide.buttonText && slide.linkUrl && (
                    <MenuLink
                      href={slide.linkUrl}
                      className={`mt-6 inline-block px-8 py-3.5 text-sm font-medium uppercase tracking-wider transition ${
                        light
                          ? "bg-white text-black hover:bg-gold hover:text-white"
                          : "bg-black text-white hover:bg-gold"
                      }`}
                    >
                      {slide.buttonText}
                    </MenuLink>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {many && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 shadow transition hover:bg-white sm:flex"
          >
            <LuChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 shadow transition hover:bg-white sm:flex"
          >
            <LuChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-1 flex justify-center">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Show slide ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                // The button is 24px (an easy target for a finger); the dot you see is smaller
                className="group flex h-6 w-6 items-center justify-center"
              >
                <span
                  className={`block h-2.5 rounded-full transition-all ${
                    i === index ? "w-8 bg-white" : "w-2.5 bg-white/60 group-hover:bg-white/80"
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
