import type { Metadata } from "next";
import { AttributesManager } from "@/modules/catalog/components/AttributesManager";

export const metadata: Metadata = { title: "Filters" };

export default function FiltersPage() {
  return <AttributesManager />;
}
