import type { Metadata } from "next";
import { getAdminSession } from "@/modules/auth/api/admin-session";
import { DashboardView } from "@/modules/analytics/components/DashboardView";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const admin = await getAdminSession();
  const firstName = admin?.name.split(" ")[0] ?? "";

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-serif text-3xl font-bold">Welcome back{firstName ? `, ${firstName}` : ""}</h1>
      <p className="mb-6 mt-2 text-muted">Here is how your shop is doing.</p>
      <DashboardView />
    </div>
  );
}
