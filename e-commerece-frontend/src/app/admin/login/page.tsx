import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/shared/components/Logo";
import { getAdminSession } from "@/modules/auth/api/admin-session";
import { ADMIN_HOME_PATH } from "@/modules/auth/constants";
import { AdminLoginForm } from "@/modules/auth/components/AdminLoginForm";

export const metadata: Metadata = { title: "Sign in" };

// Only follow redirects back into the admin area (no open redirects)
function safeNext(next: string | undefined): string {
  if (next && next.startsWith("/admin") && !next.startsWith("//") && !next.includes(":")) {
    return next;
  }
  return ADMIN_HOME_PATH;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; expired?: string }>;
}) {
  const { next, expired } = await searchParams;
  const target = safeNext(next);

  // Already signed in → straight into the panel. If the backend is unreachable,
  // still show the form (it explains the problem when you try to sign in).
  const session = await getAdminSession().catch(() => null);
  if (session) redirect(target);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" preload />
        </div>
        <div className="rounded-sm border border-line bg-white p-6 shadow-sm sm:p-8">
          <h1 className="font-serif text-2xl font-bold">Admin sign in</h1>
          <p className="mb-6 mt-1 text-sm text-muted">For the store owner and staff only.</p>
          <AdminLoginForm next={target} expired={expired === "1"} />
        </div>
      </div>
    </div>
  );
}
