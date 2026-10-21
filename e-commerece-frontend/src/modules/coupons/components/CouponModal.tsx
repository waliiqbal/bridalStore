"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input, Toggle } from "@/shared/admin/Form";
import { MoneyInput } from "@/shared/admin/MoneyInput";
import { Modal } from "@/shared/admin/Modal";
import { createCoupon, updateCoupon } from "../api/coupons.admin.api";
import { dayToInput, endOfDay, startOfDay } from "../lib/coupon-text";
import type { AdminCoupon, CouponType } from "../types/coupons";

const TYPES: { value: CouponType; label: string; hint: string }[] = [
  { value: "PERCENTAGE", label: "Percentage off", hint: "Like 10% off the items" },
  { value: "FIXED_AMOUNT", label: "Money off", hint: "Like $20 off the items" },
  { value: "FREE_SHIPPING", label: "Free shipping", hint: "Shipping costs nothing" },
];

type Errors = Partial<Record<"code" | "value" | "maxUses" | "dates", string>>;

// Make a discount code, or change one. Amounts are in Australian dollars.
export function CouponModal({
  coupon,
  onClose,
  onSaved,
}: {
  coupon: AdminCoupon | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ui = useAdminUi();
  const [code, setCode] = useState(coupon?.code ?? "");
  const [type, setType] = useState<CouponType>(coupon?.type ?? "PERCENTAGE");
  const [percent, setPercent] = useState(coupon?.type === "PERCENTAGE" ? String(coupon.value) : "");
  const [amount, setAmount] = useState<number | null>(coupon?.type === "FIXED_AMOUNT" ? coupon.value : null);
  const [minOrder, setMinOrder] = useState<number | null>(coupon?.minOrderAmount ?? null);
  const [maxUses, setMaxUses] = useState(coupon?.maxUses ? String(coupon.maxUses) : "");
  const [starts, setStarts] = useState(dayToInput(coupon?.startsAt ?? null));
  const [ends, setEnds] = useState(dayToInput(coupon?.expiresAt ?? null));
  const [active, setActive] = useState(coupon?.isActive ?? true);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const clear = (key: keyof Errors) => setErrors((current) => ({ ...current, [key]: undefined }));

  async function save(event: FormEvent) {
    event.preventDefault();
    const found: Errors = {};
    if (!coupon && !/^[A-Za-z0-9_-]{3,30}$/.test(code.trim()))
      found.code = "Use 3 to 30 letters or numbers, like EID10.";
    if (type === "PERCENTAGE" && !(/^\d+$/.test(percent.trim()) && +percent >= 1 && +percent <= 100)) {
      found.value = "Enter a whole number from 1 to 100.";
    }
    if (type === "FIXED_AMOUNT" && (!amount || amount < 1)) found.value = "Enter how much money to take off.";
    if (maxUses.trim() && !(/^\d+$/.test(maxUses.trim()) && +maxUses >= 1))
      found.maxUses = "Enter a whole number, or leave it empty.";
    if (starts && ends && ends < starts) found.dates = "The last day can't be before the first day.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const body = {
        type,
        value: type === "PERCENTAGE" ? Number(percent) : type === "FIXED_AMOUNT" ? (amount ?? 0) : 0,
        minOrderAmount: minOrder && minOrder > 0 ? minOrder : null,
        maxUses: maxUses.trim() ? Number(maxUses) : null,
        startsAt: startOfDay(starts),
        expiresAt: endOfDay(ends),
        isActive: active,
      };
      if (coupon) await updateCoupon(coupon.id, body);
      else await createCoupon({ ...body, code: code.trim().toUpperCase() });
      ui.success(coupon ? "Code saved." : "Code created. Customers can use it now.");
      onSaved();
    } catch (error) {
      ui.error(error);
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={coupon ? `Change ${coupon.code}` : "Create a discount code"}
      size="lg"
      onClose={onClose}
    >
      <form onSubmit={save} noValidate className="space-y-5">
        <Field
          label="Code"
          htmlFor="coupon-code-field"
          required={!coupon}
          error={errors.code}
          hint={
            coupon
              ? "A code can't be renamed. Create a new one instead."
              : "What customers type at checkout, like EID10 or WELCOME15."
          }
        >
          <Input
            id="coupon-code-field"
            value={code}
            maxLength={30}
            autoFocus={!coupon}
            disabled={!!coupon}
            className="uppercase"
            onChange={(event) => {
              setCode(event.target.value);
              clear("code");
            }}
            aria-invalid={!!errors.code}
          />
        </Field>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">What does it give?</legend>
          {TYPES.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 text-sm ${
                type === option.value ? "border-black" : "border-line hover:border-gold"
              }`}
            >
              <input
                type="radio"
                name="coupon-type"
                checked={type === option.value}
                onChange={() => {
                  setType(option.value);
                  clear("value");
                }}
                className="h-4 w-4 accent-black"
              />
              <span>
                <span className="font-medium">{option.label}</span>
                <span className="ml-2 text-muted">{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {type === "PERCENTAGE" && (
          <Field label="Percentage" htmlFor="coupon-percent" required error={errors.value}>
            <div className="relative max-w-40">
              <Input
                id="coupon-percent"
                inputMode="numeric"
                value={percent}
                maxLength={3}
                className="pr-10"
                onChange={(event) => {
                  setPercent(event.target.value);
                  clear("value");
                }}
                aria-invalid={!!errors.value}
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted">
                %
              </span>
            </div>
          </Field>
        )}
        {type === "FIXED_AMOUNT" && (
          <Field
            label="Amount off (AUD)"
            htmlFor="coupon-amount"
            required
            error={errors.value}
            hint="Customers in other currencies get the matching amount."
          >
            <div className="max-w-48">
              <MoneyInput
                id="coupon-amount"
                value={amount}
                onChange={(cents) => {
                  setAmount(cents);
                  clear("value");
                }}
              />
            </div>
          </Field>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Smallest order (AUD)"
            htmlFor="coupon-min"
            hint="Optional. For example 100 means it only works on orders over $100."
          >
            <MoneyInput id="coupon-min" value={minOrder} onChange={setMinOrder} />
          </Field>
          <Field
            label="Most times it can be used"
            htmlFor="coupon-max"
            error={errors.maxUses}
            hint="Optional. For example 50. Leave empty for no limit."
          >
            <Input
              id="coupon-max"
              inputMode="numeric"
              value={maxUses}
              onChange={(event) => {
                setMaxUses(event.target.value);
                clear("maxUses");
              }}
              aria-invalid={!!errors.maxUses}
            />
          </Field>
          <Field
            label="First day"
            htmlFor="coupon-starts"
            hint="Optional. Leave empty to start straight away."
          >
            <Input
              id="coupon-starts"
              type="date"
              value={starts}
              onChange={(event) => {
                setStarts(event.target.value);
                clear("dates");
              }}
            />
          </Field>
          <Field
            label="Last day"
            htmlFor="coupon-ends"
            error={errors.dates}
            hint="Optional. It stops working at the end of this day."
          >
            <Input
              id="coupon-ends"
              type="date"
              value={ends}
              onChange={(event) => {
                setEnds(event.target.value);
                clear("dates");
              }}
              aria-invalid={!!errors.dates}
            />
          </Field>
        </div>

        <Toggle
          checked={active}
          onChange={setActive}
          label="This code works"
          hint="Switch off to pause it without deleting it."
        />

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {coupon ? "Save code" : "Create code"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
