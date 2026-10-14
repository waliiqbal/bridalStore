import type { Metadata } from "next";
import { PagesList } from "@/modules/pages/components/PagesList";

export const metadata: Metadata = { title: "Pages" };

export default function PagesPage() {
  return <PagesList />;
}
