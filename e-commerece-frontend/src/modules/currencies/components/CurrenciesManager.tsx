"use client";

import { useState } from "react";
import { LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { useAdminQuery } from "@/shared/admin/hooks";
import { Badge, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { deleteCurrency, listCurrencies, updateCurrency } from "../api/currencies.admin.api";
import { roundingLabel } from "../lib/rounding";
import type { AdminCurrency } from "../types/currencies";
import { CurrencyModal } from "./CurrencyModal";

// The currencies customers can shop in. Your prices are in Australian dollars (AUD); each other
// currency is worked out from them using the exchange rate you set here.
export function CurrenciesManager() {
  const ui = useAdminUi();
  const list = useAdminQuery(listCurrencies, []);
  const data = list.data;
  // `null` = closed, "new" = adding, otherwise the currency being changed
  const [editing, setEditing] = useState<AdminCurrency | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(currency: AdminCurrency) {
    setBusy(currency.code);
    try {
      await updateCurrency(currency.code, { isEnabled: !currency.isEnabled });
      ui.success(
        currency.isEnabled
          ? `${currency.code} is hidden from customers.`
          : `${currency.code} is shown to customers.`,
      );
      list.reload();
    } catch (error) {
      ui.error(error);
    } finally {
      setBusy(null);
    }
  }

  async function remove(currency: AdminCurrency) {
    const ok = await ui.confirm({
      title: `Delete ${currency.code}?`,
      message: "Customers will no longer be able to shop in this currency. Past orders are not affected.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteCurrency(currency.code);
      ui.success("Currency deleted.");
      list.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  return (
    <>
      <PageHeader
        title="Currencies"
        description="Your prices are in Australian dollars. Customers can see them in other currencies, worked out with the exchange rate you set here. Remember to update the rates now and then."
        actions={
          <Button onClick={() => setEditing("new")}>
            <LuPlus className="h-4 w-4" />
            Add a currency
          </Button>
        }
      />

      {list.error && (
        <div className="space-y-3">
          <Notice tone="error">{list.error}</Notice>
          <Button variant="secondary" onClick={list.reload}>
            Try again
          </Button>
        </div>
      )}
      {!list.error && !data && <Spinner />}

      {!list.error && data && (
        <ul
          className={`divide-y divide-line rounded-sm border border-line bg-white ${list.loading ? "opacity-60 transition" : "transition"}`}
        >
          {data.map((currency) => (
            <li key={currency.code} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
              <div className="min-w-0 flex-1 basis-56">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {currency.code} <span className="text-muted">({currency.symbol})</span>
                  {currency.isDefault && <Badge tone="gold">Your shop&apos;s currency</Badge>}
                  {!currency.isEnabled && <Badge tone="amber">Hidden</Badge>}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {currency.isDefault
                    ? "Prices are stored in this currency. It can't be changed or hidden."
                    : `1 AUD = ${Number(currency.rateFromAud)} ${currency.code} · ${roundingLabel(currency.roundTo)}`}
                </p>
              </div>
              {!currency.isDefault && (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busy === currency.code}
                    onClick={() => toggle(currency)}
                  >
                    {currency.isEnabled ? "Hide" : "Show"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(currency)}>
                    <LuPencil className="h-4 w-4" />
                    Change
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(currency)}
                    aria-label={`Delete ${currency.code}`}
                    className="flex h-9 w-9 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <CurrencyModal
          key={editing === "new" ? "new" : editing.code}
          currency={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
    </>
  );
}
