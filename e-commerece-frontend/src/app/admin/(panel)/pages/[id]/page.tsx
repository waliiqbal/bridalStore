import type { Metadata } from "next";
import { PageEditor } from "@/modules/pages/components/PageEditor";

export const metadata: Metadata = { title: "Edit page" };

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PageEditor pageId={id} />;
}
