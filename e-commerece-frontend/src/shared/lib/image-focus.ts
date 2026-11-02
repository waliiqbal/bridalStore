import type { CSSProperties } from "react";

// Which part of a picture to show when the box on the website is a different shape from the
// picture. The owner drags the picture in the admin; the result is kept at the end of the picture's
// address, like  https://…/banner.webp#focus=40,25  (40% from the left, 25% from the top).
// It sits in the "#" part of the address, which a browser never sends to the picture's server, so the
// picture itself loads exactly as before. Every place that draws a picture takes it off with
// `imageSrc` and applies the position with `focusStyle`.
export interface Focus {
  x: number;
  y: number;
}

export const CENTRE: Focus = { x: 50, y: 50 };

const FOCUS = /#focus=(\d{1,3}),(\d{1,3})$/;

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

// The picture's address without the saved position (what to load and show)
export function imageSrc(url: string): string;
export function imageSrc(url: string | null | undefined): string | undefined;
export function imageSrc(url: string | null | undefined): string | undefined {
  return url ? url.replace(FOCUS, "") : undefined;
}

export function parseFocus(url: string | null | undefined): Focus {
  const match = url ? FOCUS.exec(url) : null;
  return match ? { x: clamp(Number(match[1])), y: clamp(Number(match[2])) } : CENTRE;
}

// The address with the position saved in it (the centre is the default, so it adds nothing)
export function withFocus(url: string, focus: Focus): string {
  const clean = imageSrc(url);
  const x = clamp(focus.x);
  const y = clamp(focus.y);
  return x === CENTRE.x && y === CENTRE.y ? clean : `${clean}#focus=${x},${y}`;
}

// CSS value for `object-position`, e.g. "40% 25%"
export function focusPosition(url: string | null | undefined): string {
  const { x, y } = parseFocus(url);
  return `${x}% ${y}%`;
}

// Inline style for a picture that fills its box with `object-cover`
export function focusStyle(url: string | null | undefined): CSSProperties | undefined {
  return url && FOCUS.test(url) ? { objectPosition: focusPosition(url) } : undefined;
}
