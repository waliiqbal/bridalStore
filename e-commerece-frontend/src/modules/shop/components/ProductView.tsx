"use client";

import { trackAddToCart, trackViewContent } from "@/modules/tracking/lib/track";
import { useEffect, useState, type ReactNode } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { LuTruck } from "react-icons/lu";
import { useCart } from "@/modules/cart/components/CartProvider";
import { formatMoney } from "@/shared/lib/money";
import {
  colourAvailable,
  enquiryMessage,
  firstImageIndexFor,
  isComplete,
  selectedVariant,
  sizeAvailable,
  stockLabel,
} from "../lib/product-options";
import { swatchFor } from "../lib/swatch";
import type { ProductDetail } from "../types/shop";
import { OptionPicker } from "./OptionPicker";
import { ProductGallery } from "./ProductGallery";
import { SizeGuideDialog } from "./SizeGuideDialog";

const STOCK_TONE = {
  ok: "text-emerald-700",
  low: "text-amber-700",
  out: "text-red-600",
  neutral: "text-muted",
} as const;

// The photos on the left; the name, price, colour and size choice, stock and buttons on the right.
// `children` (description, details, shipping) sit under the buttons.
export function ProductView({
  product,
  whatsappHref,
  productUrl,
  children,
}: {
  product: ProductDetail;
  whatsappHref: string | null;
  productUrl: string;
  children: ReactNode;
}) {
  const { colours, sizes, variants } = product;
  const [colour, setColour] = useState<string | null>(colours.length === 1 ? colours[0] : null);
  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [imageIndex, setImageIndex] = useState(0);
  const { add, busy, error } = useCart();
  // Only show the server's reason ("Only 2 available.") for the add that just failed
  const [failed, setFailed] = useState(false);

  const selection = { colour, size };
  const variant = selectedVariant(variants, selection, colours, sizes);
  const stock = stockLabel(variant, variants);
  const complete = isComplete(selection, colours, sizes);

  // The price of the chosen size/colour if it has its own, otherwise the product's price
  const price = variant?.price ?? product.price;
  const compare = product.compareAtPrice;
  const onSale =
    !!compare && compare.amount > price.amount && (!variant || variant.price.amount === product.price.amount);
  const percentOff = onSale ? Math.round((1 - price.amount / compare.amount) * 100) : 0;
  const tag = product.badge ?? (product.isNewArrival ? "New" : null);

  // Tell Meta and Google someone looked at this product
  useEffect(() => {
    trackViewContent(
      { sku: product.variants[0]?.sku ?? product.slug, name: product.name, unitPrice: product.price.amount, quantity: 1 },
      product.price.currencyCode,
    );
  }, [product]);

  async function addToBag() {
    if (!variant) return;
    setFailed(false);
    const added = await add(variant.id, 1);
    setFailed(!added);
    if (added) {
      trackAddToCart(
        { sku: variant.sku, name: product.name, unitPrice: variant.price.amount, quantity: 1 },
        variant.price.currencyCode,
      );
    }
  }

  function chooseColour(value: string) {
    setFailed(false);
    setColour(value);
    // A size that this colour doesn't have in stock can't stay chosen
    if (size && !sizeAvailable(variants, size, value)) setSize(null);
    // Show the photo of that colour, if the owner labelled one
    const photo = firstImageIndexFor(product.images, value);
    if (photo >= 0) setImageIndex(photo);
  }

  const missing = [
    colours.length > 0 && !colour ? "a colour" : null,
    sizes.length > 0 && !size ? "a size" : null,
  ]
    .filter(Boolean)
    .join(" and ");

  const delivery = product.isReadyToShip
    ? "Ready to ship. Sent within a few working days."
    : product.deliveryDays
      ? `Made to order. Ready in about ${product.deliveryDays} days, then shipped to you.`
      : null;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-12">
      <ProductGallery
        images={product.images}
        index={imageIndex}
        onIndexChange={setImageIndex}
        name={product.name}
      />

      <div>
        {tag && (
          <span className="inline-block bg-black px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-white">
            {tag}
          </span>
        )}
        <h1 className="mt-2 font-serif text-3xl font-bold leading-tight">{product.name}</h1>

        <p className="mt-3 flex flex-wrap items-baseline gap-x-3 text-2xl">
          <span className={onSale ? "font-medium text-red-600" : "font-medium"}>{formatMoney(price)}</span>
          {onSale && compare && (
            <span className="text-base text-muted line-through">{formatMoney(compare)}</span>
          )}
          {onSale && <span className="text-sm font-medium text-red-600">{percentOff}% off</span>}
        </p>

        <div className="mt-6 space-y-5">
          {colours.length > 0 && (
            <OptionPicker
              label="Colour"
              chosen={colour}
              value={colour}
              onChange={chooseColour}
              options={colours.map((value) => ({
                value,
                swatch: swatchFor(value),
                disabled: !colourAvailable(variants, value, null),
              }))}
            />
          )}

          {sizes.length > 0 && (
            <OptionPicker
              label="Size"
              chosen={size}
              value={size}
              onChange={(value) => {
                setFailed(false);
                setSize(value);
              }}
              action={
                product.sizeGuide && (
                  <SizeGuideDialog name={product.sizeGuide.name} html={product.sizeGuide.content} />
                )
              }
              options={sizes.map((value) => ({ value, disabled: !sizeAvailable(variants, value, colour) }))}
            />
          )}
        </div>

        <p aria-live="polite" className={`mt-5 text-sm font-medium ${STOCK_TONE[stock.tone]}`}>
          {complete || stock.tone === "out" ? stock.text : `Choose ${missing}`}
        </p>

        {delivery && (
          <p className="mt-2 flex items-start gap-2 text-sm text-muted">
            <LuTruck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {delivery}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={addToBag}
            disabled={!complete || !variant?.inStock || busy}
            className="h-14 w-full bg-black text-sm font-medium uppercase tracking-wider text-white transition hover:bg-gold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-black sm:flex-1"
          >
            {busy ? "Adding…" : "Add to cart"}
          </button>
          {whatsappHref && (
            <a
              href={`${whatsappHref}?text=${encodeURIComponent(enquiryMessage(product.name, selection, productUrl))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 w-full items-center justify-center gap-2 border border-black text-sm font-medium uppercase tracking-wider hover:bg-black hover:text-white sm:flex-1"
            >
              <FaWhatsapp className="h-5 w-5" aria-hidden />
              Ask on WhatsApp
            </a>
          )}
        </div>
        {failed && error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}
