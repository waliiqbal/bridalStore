"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Textarea } from "@/shared/admin/Form";
import { MoneyInput } from "@/shared/admin/MoneyInput";
import { Modal } from "@/shared/admin/Modal";
import { formatMoney } from "@/shared/lib/money";
import { cancelAndRefund, refundOrder } from "../api/orders.admin.api";
import type { AdminOrder } from "../types/orders";

// Two jobs, one form:
// "refund" gives money back (all of it or part) and leaves the order as it is.
// "cancel" cancels a paid order, puts the stock back, and refunds everything.
export function RefundModal({
  order,
  mode,
  onClose,
  onDone,
}: {
  order: AdminOrder;
  mode: "refund" | "cancel";
  onClose: () => void;
  onDone: () => void;
}) {
  const ui = useAdminUi();
  const max = order.refundable;
  const [whole, setWhole] = useState(true);
  const [amount, setAmount] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ amount?: string; reason?: string }>({});
  const [saving, setSaving] = useState(false);
  const cancelling = mode === "cancel";

  async function save(event: FormEvent) {
    event.preventDefault();
    const found = {
      amount:
        cancelling || whole
          ? undefined
          : !amount || amount < 1
            ? "Please enter how much to refund."
            : amount > max.amount
              ? `You can refund up to ${formatMoney(max)}.`
              : undefined,
      reason:
        reason.trim().length >= 3
          ? undefined
          : "Please say why (a few words is fine). It is kept in the order history.",
    };
    setErrors(found);
    if (found.amount || found.reason) return;

    setSaving(true);
    try {
      if (cancelling) {
        await cancelAndRefund(order.id, reason.trim());
        ui.success(`Order ${order.orderNumber} is cancelled and the money is being refunded.`);
      } else {
        await refundOrder(order.id, reason.trim(), whole ? undefined : (amount ?? undefined));
        ui.success("The refund has been sent.");
      }
      onDone();
    } catch (error) {
      ui.error(error);
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={cancelling ? `Cancel order ${order.orderNumber}` : `Refund order ${order.orderNumber}`}
      size="md"
      onClose={onClose}
    >
      <form onSubmit={save} noValidate className="space-y-5">
        {cancelling ? (
          <p className="text-sm">
            This cancels the order, puts the items back in stock, and refunds the customer{" "}
            <strong>{formatMoney(max)}</strong> to the way they paid. It can&apos;t be undone.
          </p>
        ) : (
          <fieldset className="space-y-3">
            <legend className="mb-1 text-sm font-medium">How much?</legend>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="radio"
                name="refund-kind"
                checked={whole}
                onChange={() => setWhole(true)}
                className="h-4 w-4 accent-black"
              />
              Everything that is left to refund ({formatMoney(max)})
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="radio"
                name="refund-kind"
                checked={!whole}
                onChange={() => setWhole(false)}
                className="h-4 w-4 accent-black"
              />
              Only part of it
            </label>
            {!whole && (
              <Field
                label={`Amount to refund (${max.currencyCode})`}
                htmlFor="refund-amount"
                error={errors.amount}
                hint={`Up to ${formatMoney(max)}`}
              >
                <MoneyInput id="refund-amount" value={amount} onChange={setAmount} />
              </Field>
            )}
          </fieldset>
        )}

        <Field label="Reason" htmlFor="refund-reason" required error={errors.reason}>
          <Textarea
            id="refund-reason"
            value={reason}
            maxLength={500}
            onChange={(event) => {
              setReason(event.target.value);
              setErrors((current) => ({ ...current, reason: undefined }));
            }}
            aria-invalid={!!errors.reason}
          />
        </Field>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose}>
            {cancelling ? "Keep the order" : "Cancel"}
          </Button>
          <Button type="submit" variant="danger" loading={saving}>
            {cancelling ? "Cancel order and refund" : whole ? `Refund ${formatMoney(max)}` : "Refund"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
