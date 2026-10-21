import type { Metadata } from "next";
import { CouponsManager } from "@/modules/coupons/components/CouponsManager";

export const metadata: Metadata = { title: "Coupons" };

export default function CouponsPage() {
  return <CouponsManager />;
}
