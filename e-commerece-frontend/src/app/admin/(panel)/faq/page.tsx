import type { Metadata } from "next";
import { FaqManager } from "@/modules/faqs/components/FaqManager";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return <FaqManager />;
}
