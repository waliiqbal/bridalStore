import type { Metadata } from "next";
import { ShippingManager } from "@/modules/shipping/components/ShippingManager";

export const metadata: Metadata = { title: "Shipping" };

export default function ShippingPage() {
  return <ShippingManager />;
}
