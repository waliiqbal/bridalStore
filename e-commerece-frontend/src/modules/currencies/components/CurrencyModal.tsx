"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input, Select, Toggle } from "@/shared/admin/Form";
import { Modal } from "@/shared/admin/Modal";
import { createCurrency, updateCurrency } from "../api/currencies.admin.api";
import { ROUNDING_CHOICES, roundingLabel } from "../lib/rounding";
import type { AdminCurrency } from "../types/currencies";

// Up to 6 decimals, like the server accepts: "0.65", "1.09"
const RATE = /^\d{1,6}(\.\d{1,6})?$/;

// Add a currency, or change its exchange rate, rounding and whether customers can choose it.
export function CurrencyModal({
  currency,
  onClose,
  onSaved,
}: {
  currency: AdminCurrency | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ui = useAdminUi();
  const [code, setCode] = useState(currency?.code ?? "");
  const [symbol, setSymbol] = useState(currency?.symbol ?? "");
  // Show the rate without the trailing zeros the server adds ("0.650000" → "0.65")
  const [rate, setRate] = useState(currency ? String(Number(currency.rateFromAud)) : "");
  const [roundTo, setRoundTo] = useState(currency?.roundTo ?? 100);
  const [enabled, setEnabled] = useState(currency?.isEnabled ?? true);
  const [errors, setErrors] = useState<{ code?: string; symbol?: string; rate?: string }>({});
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const found = {
      code: currency || /^[A-Za-z]{3}$/.test(code.trim()) ? undefined : "The code is 3 letters, like USD.",
      symbol: symbol.trim() ? undefined : "Please enter the symbol, like $ or £.",
      rate:
        RATE.test(rate.trim()) && Number(rate) > 0
          ? undefined
          : "Enter how many of this currency equal 1 Australian dollar, like 0.65.",
    };
    setErrors(found);
    if (found.code || found.symbol || found.rate) return;

    setSaving(true);
    try {
      const body = { symbol: symbol.trim(), rateFromAud: rate.trim(), roundTo, isEnabled: enabled };
      if (currency) await updateCurrency(currency.code, body);
      else await createCurrency({ ...body, code: code.trim().toUpperCase() });
      ui.success(currency ? "Currency saved. Shop prices update within a minute." : "Currency added.");
      onSaved();
    } catch (error) {
      ui.error(error);
      setSaving(false);
    }
  }

  // A rounding value we don't list (set some other way) stays selectable
  const choices = ROUNDING_CHOICES.some((c) => c.value === roundTo)
    ? ROUNDING_CHOICES
    : [...ROUNDING_CHOICES, { value: roundTo, label: roundingLabel(roundTo) }];

  return (
    <Modal open title={currency ? `Change ${currency.code}` : "Add a currency"} size="md" onClose={onClose}>
      <form onSubmit={save} noValidate className="space-y-5">
        {!currency && (
          <Field
            label="Currency code"
            htmlFor="cur-code"
            required
            error={errors.code}
            hint="3 letters, like USD, GBP, CAD, NZD."
          >
            <Input
              id="cur-code"
              value={code}
              maxLength={3}
              autoFocus
              className="uppercase"
              onChange={(event) => {
                setCode(event.target.value);
                setErrors((current) => ({ ...current, code: undefined }));
              }}
              aria-invalid={!!errors.code}
            />
          </Field>
        )}
        <Field
          label="Symbol"
          htmlFor="cur-symbol"
          required
          error={errors.symbol}
          hint="Shown with prices, like $ or £ or €."
        >
          <Input
            id="cur-symbol"
            value={symbol}
            maxLength={8}
            onChange={(event) => {
              setSymbol(event.target.value);
              setErrors((current) => ({ ...current, symbol: undefined }));
            }}
            aria-invalid={!!errors.symbol}
          />
        </Field>
        <Field
          label="Exchange rate"
          htmlFor="cur-rate"
          required
          error={errors.rate}
          hint="How many of this currency equal 1 Australian dollar. For example 0.65 means A$1 = 0.65."
        >
          <Input
            id="cur-rate"
            inputMode="decimal"
            value={rate}
            onChange={(event) => {
              setRate(event.target.value);
              setErrors((current) => ({ ...current, rate: undefined }));
            }}
            aria-invalid={!!errors.rate}
          />
        </Field>
        <Field
          label="Rounding"
          htmlFor="cur-round"
          hint="Converted prices are rounded up so they look tidy, like $650 instead of $648.32."
        >
          <Select id="cur-round" value={roundTo} onChange={(event) => setRoundTo(Number(event.target.value))}>
            {choices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </Select>
        </Field>
        <Toggle
          checked={enabled}
          onChange={setEnabled}
          label="Customers can choose this currency"
          hint="Switch off to hide it without deleting it."
        />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {currency ? "Save currency" : "Add currency"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
