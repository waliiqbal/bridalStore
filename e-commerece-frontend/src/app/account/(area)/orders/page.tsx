import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LuPackage } from "react-icons/lu";
import { OrderStatusBadge } from "@/modules/account/components/OrderStatusBadge";
import { accountGet } from "@/modules/account/server";
import type { OrderSummary } from "@/modules/account/types/account";
import type { Paged } from "@/modules/shop/types/shop";
import { SimplePagination } from "@/shared/components/SimplePagination";
import { formatDate } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";

export const metadata: Metadata = { title: "My orders" };

const PAGE_SIZE = 10;
type Props = { searchParams: Promise<{ page?: string }> };

export default async function OrdersPage({ searchParams }: Props) {
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);
  const orders = await accountGet<Paged<OrderSummary>>(
    `/account/orders?page=${page}&pageSize=${PAGE_SIZE}`,
    "/account/orders",
  );

  return (
    <section aria-labelledby="orders-heading">
      <h2 id="orders-heading" className="mb-5 font-serif text-2xl font-bold">
        My orders
      </h2>

      {orders.items.length === 0 ? (
        <div className="rounded-sm border border-dashed border-line bg-cream/50 px-6 py-14 text-center">
          <LuPackage className="mx-auto h-10 w-10 text-gold" aria-hidden />
          <p className="mt-3 font-serif text-xl font-bold">No orders yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
            When you place an order, you will be able to follow it here.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center bg-black px-7 text-sm font-medium uppercase tracking-wider text-white transition hover:bg-gold"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {orders.items.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.orderNumber}`}
                  className="flex items-center gap-4 rounded-sm border border-line bg-white p-3 transition hover:border-gold sm:p-4"
                >
                  <div className="relative h-24 w-[4.5rem] shrink-0 overflow-hidden bg-cream sm:h-28 sm:w-[5.25rem]">
                    {order.imageUrl && (
                      <Image src={order.imageUrl} alt="" fill sizes="84px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium">{order.orderNumber}</span>
                      <OrderStatusBadge status={order.status} label={order.statusLabel} />
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {formatDate(order.placedAt ?? order.createdAt)} · {order.itemCount}{" "}
                      {order.itemCount === 1 ? "item" : "items"}
                    </p>
                    <p className="mt-1 text-sm font-medium">{formatMoney(order.total)}</p>
                  </div>
                  <span className="hidden shrink-0 text-sm underline underline-offset-4 sm:block">
                    View order
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <SimplePagination
            basePath="/account/orders"
            page={orders.page}
            pageSize={orders.pageSize}
            total={orders.total}
          />
        </>
      )}
    </section>
  );
}
