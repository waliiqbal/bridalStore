import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/modules/account/components/AuthCard";
import { ResetPasswordForm } from "@/modules/account/components/ResetPasswordForm";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ token?: string | string[] }> };

// The page the "reset your password" email opens.
export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const value = Array.isArray(token) ? token[0] : token;

  return (
    <AuthCard title="Choose a new password">
      {value ? (
        <ResetPasswordForm token={value} creating={false} />
      ) : (
        <p className="text-center text-muted">
          This link isn&apos;t complete.{" "}
          <Link href="/forgot-password" className="underline underline-offset-4 hover:text-gold">
            Ask for a new one
          </Link>
          .
        </p>
      )}
    </AuthCard>
  );
}
