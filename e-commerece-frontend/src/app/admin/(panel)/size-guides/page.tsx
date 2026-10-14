import type { Metadata } from "next";
import { SizeGuidesManager } from "@/modules/catalog/components/SizeGuidesManager";

export const metadata: Metadata = { title: "Size guides" };

export default function SizeGuidesPage() {
  return <SizeGuidesManager />;
}
