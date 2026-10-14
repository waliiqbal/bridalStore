import type { Metadata } from "next";
import { CollectionEditor } from "@/modules/collections/components/CollectionEditor";

export const metadata: Metadata = { title: "Add collection" };

export default function NewCollectionPage() {
  return <CollectionEditor />;
}
