"use client";

import Link from "next/link";
import { OrderStatusBadge } from "@/modules/account/components/OrderStatusBadge";
import { Button } from "@/shared/admin/Button";
import { useAdminQuery } from "@/shared/admin/hooks";
import { Card, Notice, Spinner } from "@/shared/admin/Layout";
import { formatDate } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import { getDashboard } from "../api/dashboard.admin.api";
import type { DashboardData, SalesPeriod } from "../types/dashboard";

function SalesCard({ label, period }: { label: string; period: SalesPeriod }) {
  return (
    <div className="rounded-sm border border-line bg-white p-4 sm:p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-serif text-3xl font-bold">{formatMoney(period.sales)}</p>
      <p className="mt-1 text-sm text-muted">
        {period.orders} {period.orders === 1 ? "order" : "orders"}
      </p>
    </div>
  );
}

// The things the owner should do today, each a link to the right screen
function todoRows(toDo: DashboardData["toDo"]) {
  return [
    { count: toDo.toSend, label: "Paid orders to send", href: "/admin/orders" },
    { count: toDo.needsAttention, label: "Orders that need your attention", href: "/admin/orders" },
    { count: toDo.reviewsWaiting, label: "Reviews waiting for you", href: "/admin/reviews" },
    { count: toDo.newEnquiries, label: "New enquiries to answer", href: "/admin/enquiries" },
  ];
}

export function DashboardView() {
  const dashboard = useAdminQuery(getDashboard, []);
  const data = dashboard.data;

  if (dashboard.error) {
    return (
      <div className="space-y-3">
        <Notice tone="error">{dashboard.error}</Notice>
        <Button variant="secondary" onClick={dashboard.reload}>
          Try again
        </Button>
      </div>
    );
  }
  if (!data) return <Spinner />;

  const todo = todoRows(data.toDo);
  const allDone = todo.every((row) => row.count === 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <SalesCard label="Sales today" period={data.today} />
        <SalesCard label="Sales this week" period={data.week} />
        <SalesCard label="Sales this month" period={data.month} />
      </div>
      <p className="-mt-3 text-xs text-muted">
        Only paid orders are counted (refunded and cancelled orders are left out). The week starts on Monday.
      </p>

      <Card title="Your to-do list">
        {allDone ? (
          <p className="text-sm text-muted">All done. Nothing is waiting for you right now.</p>
        ) : (
          <ul className="divide-y divide-line">
            {todo
              .filter((row) => row.count > 0)
              .map((row) => (
                <li key={row.label}>
                  <Link
                    href={row.href}
                    className="flex items-center justify-between gap-3 py-3 hover:text-gold"
                  >
                    <span>{row.label}</span>
                    <span className="min-w-8 rounded-full bg-black px-2.5 py-0.5 text-center text-sm text-white">
                      {row.count}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Latest orders">
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 hover:text-gold"
                  >
                    <span>
                      <span className="font-medium">{order.orderNumber}</span>
                      <span className="block text-xs text-muted">
                        {order.shipFullName} · {formatDate(order.at)}
                      </span>
                    </span>
                    <OrderStatusBadge status={order.status} label={order.statusLabel} />
                    <span className="w-24 text-right text-sm">{formatMoney(order.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Running low"
          description={`Sizes and colours with ${data.lowStock.limit} or fewer left.`}
        >
          {data.lowStock.items.length === 0 ? (
            <p className="text-sm text-muted">Everything is well stocked.</p>
          ) : (
            <>
              <ul className="divide-y divide-line">
                {data.lowStock.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/admin/products/${item.product.id}`}
                      className="flex items-center justify-between gap-3 py-3 hover:text-gold"
                    >
                      <span>
                        <span className="font-medium">{item.product.name}</span>
                        <span className="block text-xs text-muted">
                          {[item.colour, item.size && `Size ${item.size}`].filter(Boolean).join(" · ") ||
                            item.sku}
                        </span>
                      </span>
                      <span className={item.stock === 0 ? "text-sm text-red-600" : "text-sm text-amber-700"}>
                        {item.stock === 0 ? "Sold out" : `${item.stock} left`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {data.lowStock.total > data.lowStock.items.length && (
                <p className="mt-3 text-xs text-muted">
                  and {data.lowStock.total - data.lowStock.items.length} more. Open Products to see them all.
                </p>
              )}
            </>
          )}
        </Card>
      </div>

      {data.topProducts.length > 0 && (
        <Card title="Best sellers" description="Most sold of all time.">
          <ol className="divide-y divide-line">
            {data.topProducts.map((product, index) => (
              <li key={product.id}>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:text-gold"
                >
                  <span>
                    <span className="mr-3 text-muted">{index + 1}</span>
                    {product.name}
                  </span>
                  <span className="text-sm text-muted">{product.salesCount} sold</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
