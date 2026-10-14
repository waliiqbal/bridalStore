import type { Metadata } from "next";
import { CategoriesManager } from "@/modules/catalog/components/CategoriesManager";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  return <CategoriesManager />;
}
