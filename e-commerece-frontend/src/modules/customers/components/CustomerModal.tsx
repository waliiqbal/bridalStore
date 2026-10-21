"use client";

import { useState } from "react";
import Link from "next/link";
import { OrderStatusBadge } from "@/modules/account/components/OrderStatusBadge";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { useAdminQuery } from "@/shared/admin/hooks";
import { Badge, Notice, Spinner } from "@/shared/admin/Layout";
import { Modal } from "@/shared/admin/Modal";
import { countryName } from "@/shared/lib/countries";
import { formatDate } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import { getCustomer, setCustomerActive } from "../api/customers.admin.api";
import type { AdminCustomer } from "../types/customers";
import { customerName } from "./customer-name";

// One customer: contact details, saved addresses and their latest orders.
export function CustomerModal({
  customer,
  onClose,
  onChanged,
}: {
  customer: AdminCustomer;
  onClose: () => void;
  onChanged: () => void;
}) {
  const ui = useAdminUi();
  const detail = useAdminQuery(() => getCustomer(customer.id), [customer.id]);
  const [saving, setSaving] = useState(false);
  const data = detail.data;
  const active = data?.isActive ?? customer.isActive;

  async function toggle() {
    if (active) {
      const ok = await ui.confirm({
        title: `Switch off ${customerName(customer)}?`,
        message:
          "They will be signed out straight away and can't sign in again. Their orders are kept, and you can switch them back on any time.",
        confirmLabel: "Switch off",
        danger: true,
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      await setCustomerActive(customer.id, !active);
      ui.success(active ? "Customer switched off." : "Customer switched on.");
      detail.reload();
      onChanged();
    } catch (error) {
      ui.error(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      size="lg"
      title={customerName(customer)}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant={active ? "danger" : "primary"} onClick={toggle} loading={saving}>
            {active ? "Switch off this customer" : "Switch on this customer"}
          </Button>
        </>
      }
    >
      {detail.error && <Notice tone="error">{detail.error}</Notice>}
      {!detail.error && !data && <Spinner />}
      {data && (
        <div className="space-y-6 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={data.isActive ? "green" : "red"}>{data.isActive ? "Active" : "Switched off"}</Badge>
            <Badge tone={data.hasAccount ? "gold" : "neutral"}>
              {data.hasAccount ? "Has an account" : "Guest (no account)"}
            </Badge>
            {data.marketingOptIn && <Badge tone="neutral">Happy to get offers</Badge>}
          </div>

          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">Email</dt>
              <dd>
                <a href={`mailto:${data.email}`} className="underline hover:text-gold">
                  {data.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Phone</dt>
              <dd>{data.phone ?? "Not given"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Customer since</dt>
              <dd>{formatDate(data.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Orders and total paid</dt>
              <dd>
                {data.orderCount} {data.orderCount === 1 ? "order" : "orders"} ·{" "}
                {formatMoney(data.totalSpent)}
              </dd>
            </div>
          </dl>

          <section>
            <h3 className="mb-2 font-medium">Saved addresses</h3>
            {data.addresses.length === 0 ? (
              <p className="text-muted">No saved addresses.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {data.addresses.map((a) => (
                  <li key={a.id} className="rounded-sm border border-line p-3">
                    <address className="not-italic leading-relaxed text-muted">
                      <span className="text-black">{a.fullName}</span>
                      <br />
                      {a.line1}
                      {a.line2 && (
                        <>
                          <br />
                          {a.line2}
                        </>
                      )}
                      <br />
                      {[a.city, a.state, a.postcode].filter(Boolean).join(" ")}
                      <br />
                      {countryName(a.countryCode)}
                    </address>
                    {a.isDefault && <p className="mt-2 text-xs text-gold">Main address</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 font-medium">Latest orders</h3>
            {data.recentOrders.length === 0 ? (
              <p className="text-muted">No orders yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-sm border border-line">
                {data.recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 hover:bg-cream/50"
                    >
                      <span className="font-medium">{order.orderNumber}</span>
                      <span className="text-muted">{formatDate(order.createdAt)}</span>
                      <OrderStatusBadge status={order.status} label={order.statusLabel} />
                      <span>{formatMoney(order.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
