import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { safeNext } from "@/modules/account/constants";
import { AuthCard } from "@/modules/account/components/AuthCard";
import { RegisterForm } from "@/modules/account/components/RegisterForm";
import { getCustomer } from "@/modules/account/server";

export const metadata: Metadata = { title: "Create an account", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function RegisterPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const target = safeNext(next);
  if (await getCustomer()) redirect(target);

  const loginHref = `/login${next ? `?next=${encodeURIComponent(target)}` : ""}`;
  return (
    <AuthCard
      title="Create an account"
      subtitle="Save your details, follow your orders and keep a wishlist of outfits you love."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={loginHref}
            className="font-medium text-foreground underline underline-offset-4 hover:text-gold"
          >
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm next={target} />
    </AuthCard>
  );
}
