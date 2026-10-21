"use client";

import { FormError } from "@/shared/components/FormError";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { LuCircleCheck } from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { Field } from "@/shared/admin/Form";
import { resetPassword } from "../api/account.api";
import { PasswordInput } from "./PasswordInput";

// Used by both emailed links: "reset your password" and "finish creating your account".
export function ResetPasswordForm({ token, creating }: { token: string; creating: boolean }) {
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setError("Your password must be at least 8 characters.");
    if (password !== again) return setError("The two passwords don't match.");
    setSending(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSending(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="py-4 text-center">
        <LuCircleCheck className="mx-auto h-12 w-12 text-gold" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl font-bold">
          {creating ? "Your account is ready" : "Password updated"}
        </h2>
        <p className="mt-3 text-muted">You can now sign in with your new password.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-sm bg-black px-8 text-sm font-medium uppercase tracking-wider text-white transition hover:bg-gold"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="New password" htmlFor="reset-password" hint="At least 8 characters.">
        <PasswordInput
          id="reset-password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError(null);
          }}
        />
      </Field>
      <Field label="Type it again" htmlFor="reset-again">
        <PasswordInput
          id="reset-again"
          autoComplete="new-password"
          value={again}
          onChange={(event) => {
            setAgain(event.target.value);
            setError(null);
          }}
        />
      </Field>
      {error && (
        <FormError>
          {error}
          {error.toLowerCase().includes("expired") && (
            <>
              {" "}
              <Link href="/forgot-password" className="underline">
                Get a new link
              </Link>
            </>
          )}
        </FormError>
      )}
      <Button type="submit" loading={sending} className="h-12 w-full uppercase tracking-wider">
        {creating ? "Create my account" : "Save new password"}
      </Button>
    </form>
  );
}
