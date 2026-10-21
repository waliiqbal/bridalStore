"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LuSearch } from "react-icons/lu";
import { OrderStatusBadge } from "@/modules/account/components/OrderStatusBadge";
import type { OrderStatus } from "@/modules/account/types/account";
import { Button } from "@/shared/admin/Button";
import { Input } from "@/shared/admin/Form";
import { useAdminQuery, useDebouncedValue } from "@/shared/admin/hooks";
import { EmptyState, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { Pagination } from "@/shared/admin/Pagination";
import { formatDate } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import { listOrders } from "../api/orders.admin.api";

const PAGE_SIZE = 20;

// Plain-language tabs. "To send" is the owner's daily work: paid orders waiting to be shipped.
const TABS: { label: string; status?: OrderStatus; attention?: boolean }[] = [
  { label: "All orders" },
  { label: "Needs attention", attention: true },
  { label: "To send", status: "PROCESSING" },
  { label: "Shipped", status: "SHIPPED" },
  { label: "Delivered", status: "DELIVERED" },
  { label: "Waiting for payment", status: "PENDING_PAYMENT" },
  { label: "Cancelled", status: "CANCELLED" },
  { label: "Refunded", status: "REFUNDED" },
];

export function OrdersManager() {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const current = TABS[tab];

  const orders = useAdminQuery(
    () =>
      listOrders({ status: current.status, needsAttention: current.attention, q, page, pageSize: PAGE_SIZE }),
    [tab, q, page],
  );
  const data = orders.data;

  return (
    <>
      <PageHeader
        title="Orders"
        description="Everything customers have ordered. Open an order to ship it, add a tracking number, or give a refund."
      />

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Show orders">
        {TABS.map((item, index) => (
          <button
            key={item.label}
            type="button"
            role="tab"
            aria-selected={tab === index}
            onClick={() => {
              setTab(index);
              setPage(1);
            }}
            className={`min-h-10 rounded-full border px-4 text-sm transition ${
              tab === index ? "border-black bg-black text-white" : "border-line bg-white hover:border-gold"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative mb-5 max-w-md">
        <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search by order number, name or email"
          aria-label="Search orders"
          className="pl-11"
        />
      </div>

      {orders.error && (
        <div className="space-y-3">
          <Notice tone="error">{orders.error}</Notice>
          <Button variant="secondary" onClick={orders.reload}>
            Try again
          </Button>
        </div>
      )}
      {!orders.error && !data && <Spinner />}

      {!orders.error && data && data.items.length === 0 && (
        <EmptyState
          title={q || tab > 0 ? "No orders here" : "No orders yet"}
          description={
            q || tab > 0
              ? "Try a different search or tab."
              : "When a customer places an order it will appear here."
          }
        />
      )}

      {!orders.error && data && data.items.length > 0 && (
        <div className={orders.loading ? "opacity-60 transition" : "transition"}>
          <ul className="divide-y divide-line rounded-sm border border-line bg-white">
            {data.items.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center gap-4 p-3 hover:bg-cream/50 sm:p-4"
                >
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden bg-cream">
                    {order.imageUrl && (
                      <Image
                        src={order.imageUrl}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium">{order.orderNumber}</span>
                      <OrderStatusBadge status={order.status} label={order.statusLabel} />
                    </p>
                    <p className="mt-0.5 truncate text-sm">
                      {order.shipFullName} <span className="text-muted">· {order.email}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {formatDate(order.placedAt ?? order.createdAt)} · {order.itemCount}{" "}
                      {order.itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <p className="shrink-0 text-right font-medium">{formatMoney(order.total)}</p>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </div>
      )}
    </>
  );
}
