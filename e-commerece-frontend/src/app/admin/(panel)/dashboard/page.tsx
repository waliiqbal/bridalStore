import type { Metadata } from "next";
import { getAdminSession } from "@/modules/auth/api/admin-session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const admin = await getAdminSession();
  const firstName = admin?.name.split(" ")[0] ?? "";

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-serif text-3xl font-bold">Welcome back{firstName ? `, ${firstName}` : ""}</h1>
      <p className="mt-2 text-muted">You are signed in to your store&apos;s admin panel.</p>

      <div className="mt-8 rounded-sm border border-line bg-cream p-6">
        <h2 className="font-serif text-xl font-bold">Your panel is ready</h2>
        <p className="mt-2 text-sm text-muted">
          Sales figures, recent orders and low-stock alerts will appear here. Products, orders
          and the other sections in the menu are being added step by step.
        </p>
      </div>
    </div>
  );
}
