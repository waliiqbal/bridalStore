import type { Metadata } from "next";
import { OrderAdminPage } from "@/modules/orders/components/OrderAdminPage";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderAdminPage orderId={id} />;
}
