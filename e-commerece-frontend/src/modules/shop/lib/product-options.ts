// The rules for choosing a colour and size on the product page. Pure functions with no React,
// so they are easy to check. (Type-only imports keep this file runnable on its own.)
import type { ProductDetail } from "../types/shop";

export type Variant = ProductDetail["variants"][number];

export interface Selection {
  colour: string | null;
  size: string | null;
}

// Colours and sizes are compared ignoring capital letters ("Ivory" = "ivory")
const same = (a: string | null, b: string | null) => (a ?? "").toLowerCase() === (b ?? "").toLowerCase();

export function findVariant(variants: Variant[], colour: string | null, size: string | null): Variant | null {
  return variants.find((v) => same(v.colour, colour) && same(v.size, size)) ?? null;
}

// Is anything in stock for this colour and/or size? (null = don't care)
export function hasStock(variants: Variant[], colour: string | null, size: string | null): boolean {
  return variants.some(
    (v) => v.inStock && (colour === null || same(v.colour, colour)) && (size === null || same(v.size, size)),
  );
}

// Has the shopper chosen everything this product asks for?
export function isComplete(selection: Selection, colours: string[], sizes: string[]): boolean {
  return (
    (colours.length === 0 || selection.colour !== null) && (sizes.length === 0 || selection.size !== null)
  );
}

export function selectedVariant(
  variants: Variant[],
  selection: Selection,
  colours: string[],
  sizes: string[],
): Variant | null {
  if (!isComplete(selection, colours, sizes)) return null;
  return findVariant(
    variants,
    colours.length ? selection.colour : null,
    sizes.length ? selection.size : null,
  );
}

// A colour is on offer if some size of it is in stock (and, if a size is chosen, that size)
export const colourAvailable = (variants: Variant[], colour: string, size: string | null) =>
  hasStock(variants, colour, size);

// A size is on offer if some colour of it is in stock (and, if a colour is chosen, that colour)
export const sizeAvailable = (variants: Variant[], size: string, colour: string | null) =>
  hasStock(variants, colour, size);

export const LOW_STOCK = 3;

export interface StockLabel {
  text: string;
  tone: "ok" | "low" | "out" | "neutral";
}

export function stockLabel(variant: Variant | null, variants: Variant[]): StockLabel {
  if (variant) {
    if (!variant.inStock) return { text: "Sold out", tone: "out" };
    if (variant.stock <= LOW_STOCK) return { text: `Only ${variant.stock} left`, tone: "low" };
    return { text: "In stock", tone: "ok" };
  }
  return variants.some((v) => v.inStock)
    ? { text: "In stock. Choose your options.", tone: "neutral" }
    : { text: "Sold out", tone: "out" };
}

// The first photo labelled with this colour (so the gallery can jump to it), or -1
export function firstImageIndexFor(images: { colour: string | null }[], colour: string): number {
  return images.findIndex((image) => image.colour !== null && same(image.colour, colour));
}

// A ready-written WhatsApp message about the outfit the shopper is looking at
export function enquiryMessage(name: string, selection: Selection, url: string): string {
  const options = [selection.colour, selection.size ? `size ${selection.size}` : null]
    .filter(Boolean)
    .join(", ");
  return `Hello! I'm interested in "${name}"${options ? ` (${options})` : ""}. ${url}`;
}
