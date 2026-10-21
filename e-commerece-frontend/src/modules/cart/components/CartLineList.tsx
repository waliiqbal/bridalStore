"use client";

import Image from "next/image";
import Link from "next/link";
import { LuMinus, LuPlus, LuTrash2 } from "react-icons/lu";
import { formatMoney } from "@/shared/lib/money";
import { MAX_PER_LINE } from "../constants";
import type { CartLine, CartView } from "../types/cart";
import { useCart } from "./CartProvider";

// The items in the bag. `editable` shows the quantity buttons and Remove; without it (checkout)
// it is just a read-only list.
export function CartLineList({
  cart,
  editable = true,
  onNavigate,
}: {
  cart: CartView;
  editable?: boolean;
  // Called when a product link is followed (the side panel closes itself)
  onNavigate?: () => void;
}) {
  return (
    <ul className="divide-y divide-line">
      {cart.items.map((line) => (
        <Line key={line.id} line={line} editable={editable} onNavigate={onNavigate} />
      ))}
    </ul>
  );
}

function Line({
  line,
  editable,
  onNavigate,
}: {
  line: CartLine;
  editable: boolean;
  onNavigate?: () => void;
}) {
  const { setQuantity, remove, busy } = useCart();
  const limit = Math.max(1, Math.min(MAX_PER_LINE, line.availableQuantity));
  const problem = line.status !== "OK";
  const href = `/products/${line.product.slug}`;
  const details = [line.colour, line.size && `Size ${line.size}`].filter(Boolean).join(" · ");
  const onSale = !!line.compareAtUnitPrice && line.compareAtUnitPrice.amount > line.unitPrice.amount;

  return (
    <li className="flex gap-3 py-4 sm:gap-4">
      <Link
        href={href}
        onClick={onNavigate}
        className="relative h-28 w-[5.25rem] shrink-0 overflow-hidden bg-cream"
      >
        {line.product.imageUrl && (
          <Image
            src={line.product.imageUrl}
            alt={line.product.imageAlt ?? line.product.name}
            fill
            sizes="84px"
            className="object-cover"
          />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={href}
          onClick={onNavigate}
          className="line-clamp-2 text-sm font-medium leading-snug hover:text-gold"
        >
          {line.product.name}
        </Link>
        {details && <p className="mt-1 text-xs text-muted">{details}</p>}
        <p className="mt-1 text-sm">
          <span className={onSale ? "text-red-600" : undefined}>{formatMoney(line.unitPrice)}</span>
          {onSale && line.compareAtUnitPrice && (
            <span className="ml-2 text-xs text-muted line-through">
              {formatMoney(line.compareAtUnitPrice)}
            </span>
          )}
        </p>
        {problem && line.message && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
            {line.message}
          </p>
        )}

        {editable ? (
          <div className="mt-3 flex items-center gap-4">
            <div
              className="inline-flex items-center border border-line"
              role="group"
              aria-label={`Quantity of ${line.product.name}`}
            >
              <button
                type="button"
                aria-label="One less"
                disabled={busy || line.quantity <= 1}
                onClick={() => setQuantity(line.id, line.quantity - 1)}
                className="flex h-9 w-9 items-center justify-center hover:bg-cream disabled:opacity-40"
              >
                <LuMinus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm" aria-live="polite">
                {line.quantity}
              </span>
              <button
                type="button"
                aria-label="One more"
                disabled={busy || line.quantity >= limit}
                onClick={() => setQuantity(line.id, line.quantity + 1)}
                className="flex h-9 w-9 items-center justify-center hover:bg-cream disabled:opacity-40"
              >
                <LuPlus className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => remove(line.id)}
              className="flex items-center gap-1.5 text-xs text-muted underline-offset-4 hover:text-red-600 hover:underline disabled:opacity-40"
            >
              <LuTrash2 className="h-3.5 w-3.5" aria-hidden />
              Remove
              <span className="sr-only"> {line.product.name}</span>
            </button>
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted">Quantity: {line.quantity}</p>
        )}
      </div>

      <p className="shrink-0 text-sm font-medium">{formatMoney(line.lineTotal)}</p>
    </li>
  );
}
