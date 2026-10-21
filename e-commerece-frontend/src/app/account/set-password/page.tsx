import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/modules/account/components/AuthCard";
import { ResetPasswordForm } from "@/modules/account/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Finish creating your account",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ token?: string | string[] }> };

// The page the "finish creating your account" email opens (for people who ordered as a guest).
export default async function SetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const value = Array.isArray(token) ? token[0] : token;

  return (
    <AuthCard
      title="Finish creating your account"
      subtitle="Choose a password and your earlier orders will be waiting in your account."
    >
      {value ? (
        <ResetPasswordForm token={value} creating />
      ) : (
        <p className="text-center text-muted">
          This link isn&apos;t complete.{" "}
          <Link href="/register" className="underline underline-offset-4 hover:text-gold">
            Create an account
          </Link>
          .
        </p>
      )}
    </AuthCard>
  );
}
