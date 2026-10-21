import type { Metadata } from "next";
import { OrdersManager } from "@/modules/orders/components/OrdersManager";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return <OrdersManager />;
}
