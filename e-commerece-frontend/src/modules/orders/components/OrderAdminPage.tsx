"use client";

import { useState } from "react";
import { LuMail, LuMessageCircle, LuPhone } from "react-icons/lu";
import { OrderAddressCard, OrderItemsList, OrderTotalsCard } from "@/modules/account/components/OrderParts";
import { OrderStatusBadge } from "@/modules/account/components/OrderStatusBadge";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Textarea } from "@/shared/admin/Form";
import { useAdminQuery } from "@/shared/admin/hooks";
import { Badge, Card, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { formatDate } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import { whatsappLink } from "@/shared/layouts/whatsapp";
import { changeStatus, getOrder, resolveAttention, saveOrderNote } from "../api/orders.admin.api";
import type { AdminOrder, AdminPayment } from "../types/orders";
import { RefundModal } from "./RefundModal";
import { ShipOrderModal } from "./ShipOrderModal";

const PROVIDER: Record<AdminPayment["provider"], string> = {
  SQUARE: "Square",
  STRIPE: "Stripe",
  PAYPAL: "PayPal",
};
const PAYMENT_TONE = { SUCCEEDED: "green", PENDING: "amber", FAILED: "red", REFUNDED: "neutral" } as const;
const PAYMENT_WORDS: Record<string, string> = {
  SUCCEEDED: "Paid",
  PENDING: "Waiting",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

// One order, for the owner: what to do next, who bought it, how they paid, and what happened so far.
export function OrderAdminPage({ orderId }: { orderId: string }) {
  const ui = useAdminUi();
  const query = useAdminQuery(() => getOrder(orderId), [orderId]);
  const order = query.data;
  const [modal, setModal] = useState<"ship" | "refund" | "cancel" | null>(null);
  const [busy, setBusy] = useState(false);

  if (query.error) {
    return (
      <div className="space-y-3">
        <Notice tone="error">{query.error}</Notice>
        <Button variant="secondary" onClick={query.reload}>
          Try again
        </Button>
      </div>
    );
  }
  if (!order) return <Spinner />;

  const reload = () => {
    setModal(null);
    query.reload();
  };
  const can = (status: string) => order.nextStatuses.some((s) => s.status === status);
  const paid = order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED";

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      ui.success(success);
      query.reload();
    } catch (error) {
      ui.error(error);
    } finally {
      setBusy(false);
    }
  }

  async function markDelivered(target: AdminOrder) {
    const ok = await ui.confirm({
      title: `Mark ${target.orderNumber} as delivered?`,
      message: "Do this once the customer has received their parcel.",
      confirmLabel: "Yes, delivered",
    });
    if (ok) await run(() => changeStatus(target.id, "DELIVERED"), "Marked as delivered.");
  }

  async function cancelUnpaid(target: AdminOrder) {
    const ok = await ui.confirm({
      title: `Cancel order ${target.orderNumber}?`,
      message: "It has not been paid. The items go back in stock.",
      confirmLabel: "Cancel the order",
      danger: true,
    });
    if (ok)
      await run(
        () => changeStatus(target.id, "CANCELLED", { note: "Cancelled by the shop" }),
        "The order is cancelled.",
      );
  }

  const name =
    [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ") ||
    order.shippingAddress.fullName;
  const wa = whatsappLink(order.phone ?? order.customer?.phone);

  return (
    <>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        back={{ href: "/admin/orders", label: "All orders" }}
        description={`Placed on ${formatDate(order.placedAt ?? order.createdAt)} by ${name}`}
        actions={<OrderStatusBadge status={order.status} label={order.statusLabel} />}
      />

      {order.attentionNote && (
        <div className="mb-5">
          <Notice tone="warning">
            <p className="font-medium">This order needs your attention</p>
            <p className="mt-1">{order.attentionNote}</p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              loading={busy}
              onClick={() => run(() => resolveAttention(order.id), "Marked as dealt with.")}
            >
              I have dealt with this
            </Button>
          </Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <Card title="Items">
            <OrderItemsList items={order.items} />
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <OrderAddressCard address={order.shippingAddress} shippingMethod={order.shippingMethod} />
            <OrderTotalsCard totals={order.totals} couponCode={order.couponCode} />
          </div>
          {order.currencyCode !== "AUD" && (
            <p className="-mt-3 text-xs text-muted">
              The customer paid in {order.currencyCode}. In Australian dollars this order is{" "}
              {formatMoney(order.totalAud)}.
            </p>
          )}

          {order.customerNote && (
            <Card title="Note from the customer">
              <p className="whitespace-pre-wrap text-sm">{order.customerNote}</p>
            </Card>
          )}

          <Card title="History">
            <ol className="space-y-3 text-sm">
              {order.statusHistory.map((step, index) => (
                <li key={`${step.to}-${index}`} className="flex gap-3">
                  <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                  <span>
                    <span className="font-medium">{step.label}</span>{" "}
                    <span className="text-muted">
                      · {formatDate(step.at)}
                      {step.changedBy ? ` · by ${step.changedBy}` : ""}
                    </span>
                    {step.note && <span className="block text-muted">{step.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="What next?">
            <div className="space-y-3">
              {order.status === "PENDING_PAYMENT" && (
                <p className="text-sm text-muted">
                  Waiting for the customer to pay. The items are held for them for a short time.
                </p>
              )}
              {can("SHIPPED") && (
                <Button className="w-full" onClick={() => setModal("ship")}>
                  Mark as shipped
                </Button>
              )}
              {can("DELIVERED") && (
                <Button className="w-full" loading={busy} onClick={() => markDelivered(order)}>
                  Mark as delivered
                </Button>
              )}
              {order.refundable.amount > 0 && paid && (
                <Button variant="secondary" className="w-full" onClick={() => setModal("refund")}>
                  Refund money
                </Button>
              )}
              {can("CANCELLED") &&
                (order.status === "PENDING_PAYMENT" ? (
                  <Button
                    variant="danger"
                    className="w-full"
                    loading={busy}
                    onClick={() => cancelUnpaid(order)}
                  >
                    Cancel order
                  </Button>
                ) : (
                  <Button variant="danger" className="w-full" onClick={() => setModal("cancel")}>
                    Cancel and refund
                  </Button>
                ))}
              {order.nextStatuses.length === 0 && order.refundable.amount === 0 && (
                <p className="text-sm text-muted">Nothing more to do for this order.</p>
              )}
              {order.trackingNumber && (
                <p className="border-t border-line pt-3 text-sm">
                  <span className="font-medium">Tracking:</span> {order.trackingNumber}
                  {order.trackingUrl && (
                    <>
                      {" · "}
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4 hover:text-gold"
                      >
                        open
                      </a>
                    </>
                  )}
                </p>
              )}
            </div>
          </Card>

          <Card title="Customer">
            <p className="font-medium">{name}</p>
            <p className="mt-0.5 text-xs text-muted">
              {order.customer
                ? order.customer.hasAccount
                  ? "Has an account"
                  : "Ordered as a guest"
                : "Ordered as a guest"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`mailto:${order.email}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-line px-3 text-sm hover:border-gold hover:text-gold"
              >
                <LuMail className="h-4 w-4" />
                {order.email}
              </a>
              {order.phone && (
                <a
                  href={`tel:${order.phone.replace(/[^\d+]/g, "")}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-line px-3 text-sm hover:border-gold hover:text-gold"
                >
                  <LuPhone className="h-4 w-4" />
                  {order.phone}
                </a>
              )}
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-line px-3 text-sm hover:border-gold hover:text-gold"
                >
                  <LuMessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
            </div>
          </Card>

          <Card title="Payment">
            {order.payments.length === 0 ? (
              <p className="text-sm text-muted">No payment yet.</p>
            ) : (
              <ul className="space-y-4 text-sm">
                {order.payments.map((payment) => (
                  <li key={payment.id}>
                    <p className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        {PROVIDER[payment.provider]} · {formatMoney(payment.amount)}
                      </span>
                      <Badge tone={PAYMENT_TONE[payment.status as keyof typeof PAYMENT_TONE] ?? "neutral"}>
                        {PAYMENT_WORDS[payment.status] ?? payment.status}
                      </Badge>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{formatDate(payment.createdAt)}</p>
                    {payment.errorMessage && (
                      <p className="mt-1 text-xs text-red-600">{payment.errorMessage}</p>
                    )}
                    {payment.refunds.map((refund) => (
                      <p key={refund.id} className="mt-1 text-xs text-muted">
                        Refunded {formatMoney(refund.amount)} · {formatDate(refund.createdAt)}
                        {refund.status === "PENDING"
                          ? " (on its way)"
                          : refund.status === "FAILED"
                            ? " (failed)"
                            : ""}
                        {refund.reason ? ` · ${refund.reason}` : ""}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <NoteCard key={order.updatedAt} order={order} onSaved={query.reload} />
        </div>
      </div>

      {modal === "ship" && <ShipOrderModal order={order} onClose={() => setModal(null)} onDone={reload} />}
      {(modal === "refund" || modal === "cancel") && (
        <RefundModal order={order} mode={modal} onClose={() => setModal(null)} onDone={reload} />
      )}
    </>
  );
}

// The owner's private note about the order (the customer never sees it)
function NoteCard({ order, onSaved }: { order: AdminOrder; onSaved: () => void }) {
  const ui = useAdminUi();
  const [note, setNote] = useState(order.adminNote ?? "");
  const [saving, setSaving] = useState(false);
  const changed = note.trim() !== (order.adminNote ?? "").trim();

  async function save() {
    setSaving(true);
    try {
      await saveOrderNote(order.id, note.trim() || null);
      ui.success("Note saved.");
      onSaved();
    } catch (error) {
      ui.error(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Your private note">
      <Field
        label="Note"
        htmlFor="order-note"
        hint="Only you can see this. For example “Customer will collect on Saturday”."
      >
        <Textarea
          id="order-note"
          value={note}
          maxLength={5000}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <Button
        className="mt-3"
        size="sm"
        variant="secondary"
        loading={saving}
        disabled={!changed}
        onClick={save}
      >
        Save note
      </Button>
    </Card>
  );
}
