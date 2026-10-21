import type { Metadata } from "next";
import { CustomersManager } from "@/modules/customers/components/CustomersManager";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return <CustomersManager />;
}
