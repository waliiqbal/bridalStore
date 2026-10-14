import type { Metadata } from "next";
import { CollectionsList } from "@/modules/collections/components/CollectionsList";

export const metadata: Metadata = { title: "Collections" };

export default function CollectionsPage() {
  return <CollectionsList />;
}
