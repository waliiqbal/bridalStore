"use client";

import { EMAIL_PATTERN } from "@/shared/lib/validators";
import { useState, type FormEvent } from "react";
import { LuMailCheck } from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { Field, Input } from "@/shared/admin/Form";
import { forgotPassword } from "../api/account.api";


export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const result = await forgotPassword(email.trim());
      setSent(result.message);
    } catch (err) {
      setError(
        err instanceof Error && err.message.toLowerCase().includes("too many")
          ? "Please wait a minute before trying again."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      );
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="py-4 text-center">
        <LuMailCheck className="mx-auto h-12 w-12 text-gold" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl font-bold">Check your email</h2>
        <p className="mt-3 text-muted">{sent}</p>
        <p className="mt-3 text-sm text-muted">The link works once and lasts for 1 hour.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Email" htmlFor="forgot-email" error={error}>
        <Input
          id="forgot-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
          }}
          aria-invalid={!!error}
        />
      </Field>
      <Button type="submit" loading={sending} className="h-12 w-full uppercase tracking-wider">
        Send reset link
      </Button>
    </form>
  );
}
