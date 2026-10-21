"use client";

import { useState, type FormEvent } from "react";
import { LuTag, LuX } from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { Input } from "@/shared/admin/Form";
import { useCart } from "./CartProvider";

// "Have a code?": apply or remove a discount code. The server decides if it can be used and
// says why not in plain words.
export function CouponForm() {
  const { cart, busy, error, clearError, applyCoupon, removeCoupon } = useCart();
  const [code, setCode] = useState("");
  const [tried, setTried] = useState(false);
  const applied = cart?.coupon?.valid ? cart.coupon : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setTried(true);
    if (await applyCoupon(code.trim())) {
      setCode("");
      setTried(false);
    }
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
        <span className="flex items-center gap-2">
          <LuTag className="h-4 w-4" aria-hidden />
          Code <strong>{applied.code}</strong> applied
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => removeCoupon()}
          className="flex items-center gap-1 text-xs underline underline-offset-4 disabled:opacity-50"
        >
          <LuX className="h-3.5 w-3.5" aria-hidden />
          Remove<span className="sr-only"> code {applied.code}</span>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor="coupon-code" className="text-sm font-medium">
        Discount code
      </label>
      <div className="flex gap-2">
        <Input
          id="coupon-code"
          value={code}
          maxLength={50}
          autoComplete="off"
          placeholder="Enter your code"
          onChange={(event) => {
            setCode(event.target.value);
            if (tried) {
              setTried(false);
              clearError();
            }
          }}
          className="uppercase"
        />
        <Button type="submit" variant="secondary" loading={busy && tried} disabled={!code.trim()}>
          Apply
        </Button>
      </div>
      {tried && error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
