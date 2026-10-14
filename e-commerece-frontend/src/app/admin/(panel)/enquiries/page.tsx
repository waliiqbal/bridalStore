import type { Metadata } from "next";
import { EnquiriesManager } from "@/modules/enquiries/components/EnquiriesManager";

export const metadata: Metadata = { title: "Enquiries" };

export default function EnquiriesPage() {
  return <EnquiriesManager />;
}
