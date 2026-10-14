import type { Metadata } from "next";
import { ProductEditor } from "@/modules/catalog/components/ProductEditor";

export const metadata: Metadata = { title: "Add product" };

export default function NewProductPage() {
  return <ProductEditor />;
}
