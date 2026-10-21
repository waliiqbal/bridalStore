import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/modules/account/components/AuthCard";
import { ForgotPasswordForm } from "@/modules/account/components/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot your password?", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we will send you a link to choose a new one."
      footer={
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4 hover:text-gold"
        >
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
