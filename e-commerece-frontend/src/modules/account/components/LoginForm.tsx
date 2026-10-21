"use client";

import { FormError } from "@/shared/components/FormError";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/admin/Button";
import { Field, Input } from "@/shared/admin/Form";
import { login } from "../api/account.api";
import { sessionHint } from "../hint";
import { useShopper } from "./ShopperProvider";
import { PasswordInput } from "./PasswordInput";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { refresh } = useShopper();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await login(email.trim(), password);
      sessionHint.set();
      await refresh();
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Email" htmlFor="login-email">
        <Input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Field label="Password" htmlFor="login-password">
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>
      <p className="-mt-2 text-right text-sm">
        <Link href="/forgot-password" className="underline-offset-4 hover:text-gold hover:underline">
          Forgot your password?
        </Link>
      </p>
      {error && (
        <FormError>
          {error}
        </FormError>
      )}
      <Button type="submit" loading={sending} className="h-12 w-full uppercase tracking-wider">
        Sign in
      </Button>
    </form>
  );
}
