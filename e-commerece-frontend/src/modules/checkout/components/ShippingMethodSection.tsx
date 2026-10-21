"use client";

import { formatMoney } from "@/shared/lib/money";
import type { ShippingOptions } from "@/modules/cart/types/cart";

// Step 3: how fast. The choices and their prices come from the shipping rates the owner set for
// the chosen country ("Free" appears once the bag is over the free-shipping amount).
export function ShippingMethodSection({
  shipping,
  loading,
  chosen,
  onChoose,
  error,
}: {
  shipping: ShippingOptions | null;
  loading: boolean;
  chosen: string | null;
  onChoose: (id: string) => void;
  error?: string;
}) {
  return (
    <fieldset className="space-y-3" aria-describedby={error ? "shipping-error" : undefined}>
      <legend className="mb-1 font-serif text-xl font-bold">Shipping</legend>

      {loading && !shipping && (
        <p className="text-sm text-muted" role="status">
          Looking up shipping…
        </p>
      )}

      {shipping && !shipping.available && (
        <p
          role="alert"
          className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Sorry, we don&apos;t ship to this country yet. Please message us and we will see what we can do.
        </p>
      )}

      {shipping?.available &&
        shipping.options.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center justify-between gap-4 rounded-sm border px-4 py-3 text-sm ${
              chosen === option.id ? "border-black" : "border-line hover:border-gold"
            }`}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="shipping-method"
                checked={chosen === option.id}
                onChange={() => onChoose(option.id)}
                className="h-4 w-4 accent-black"
              />
              <span>
                <span className="font-medium">{option.name}</span>
                {option.estimatedDays && <span className="block text-muted">{option.estimatedDays}</span>}
                {!option.isFree && option.freeOver && (
                  <span className="block text-xs text-muted">Free over {formatMoney(option.freeOver)}</span>
                )}
              </span>
            </span>
            <span className="font-medium">{option.isFree ? "Free" : formatMoney(option.price)}</span>
          </label>
        ))}

      {error && (
        <p id="shipping-error" role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}
