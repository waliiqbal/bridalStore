import type { Metadata } from "next";
import { ProductsList } from "@/modules/catalog/components/ProductsList";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return <ProductsList />;
}
