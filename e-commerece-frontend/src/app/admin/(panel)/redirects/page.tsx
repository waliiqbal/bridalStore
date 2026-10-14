import type { Metadata } from "next";
import { RedirectsManager } from "@/modules/redirects/components/RedirectsManager";

export const metadata: Metadata = { title: "Redirects" };

export default function RedirectsPage() {
  return <RedirectsManager />;
}
