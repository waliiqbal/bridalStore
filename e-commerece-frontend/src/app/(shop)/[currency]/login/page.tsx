import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { safeNext } from "@/modules/account/constants";
import { AuthCard } from "@/modules/account/components/AuthCard";
import { LoginForm } from "@/modules/account/components/LoginForm";
import { getCustomer } from "@/modules/account/server";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const target = safeNext(next);
  if (await getCustomer()) redirect(target);

  const registerHref = `/register${next ? `?next=${encodeURIComponent(target)}` : ""}`;
  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back. Sign in to see your orders and saved outfits."
      footer={
        <>
          New here?{" "}
          <Link
            href={registerHref}
            className="font-medium text-foreground underline underline-offset-4 hover:text-gold"
          >
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm next={target} />
    </AuthCard>
  );
}
