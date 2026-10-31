import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/infrastructure/http/api-client";
import { OrderDetailBody } from "@/modules/account/components/OrderDetailBody";
import { OrderStatusBadge } from "@/modules/account/components/OrderStatusBadge";
import { hasReceipt, ReceiptHeading, receiptShop } from "@/modules/account/components/Receipt";
import { ReceiptButton } from "@/modules/account/components/ReceiptButton";
import { getSettings } from "@/modules/shop/api/shop.api";
import { accountGet } from "@/modules/account/server";
import type { OrderDetail } from "@/modules/account/types/account";
import { formatDate } from "@/shared/lib/date";

type Props = { params: Promise<{ orderNumber: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNumber } = await params;
  return { title: `Order ${orderNumber}` };
}

export default async function OrderPage({ params }: Props) {
  const { orderNumber } = await params;
  const path = `/account/orders/${encodeURIComponent(orderNumber)}`;
  let order: OrderDetail;
  const settings = getSettings().catch(() => null);
  try {
    order = await accountGet<OrderDetail>(path, path);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <article aria-labelledby="order-heading">
      <ReceiptHeading shop={receiptShop(await settings)} />
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/account/orders"
          className="text-sm text-muted underline-offset-4 hover:text-gold hover:underline"
        >
          ← All orders
        </Link>
        {hasReceipt(order.status) && <ReceiptButton orderNumber={order.orderNumber} />}
      </div>

      <header className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id="order-heading" className="font-serif text-2xl font-bold">
          Order {order.orderNumber}
        </h2>
        <OrderStatusBadge status={order.status} label={order.statusLabel} />
      </header>
      <p className="mt-1 text-sm text-muted">Placed on {formatDate(order.placedAt ?? order.createdAt)}</p>

      <OrderDetailBody order={order} />
    </article>
  );
}
