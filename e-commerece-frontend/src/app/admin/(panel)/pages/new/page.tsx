import type { Metadata } from "next";
import { PageEditor } from "@/modules/pages/components/PageEditor";

export const metadata: Metadata = { title: "Add page" };

export default function NewPagePage() {
  return <PageEditor />;
}
