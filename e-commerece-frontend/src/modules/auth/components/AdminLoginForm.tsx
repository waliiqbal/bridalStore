"use client";

import { FormError } from "@/shared/components/FormError";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LuEye, LuEyeOff, LuLoaderCircle } from "react-icons/lu";
import { ApiError } from "@/infrastructure/http/api-client";
import { loginAdmin } from "../api/admin-auth.api";

export function AdminLoginForm({ next, expired }: { next: string; expired: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await loginAdmin(email.trim(), password);
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(messageFor(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {expired && !error && (
        <p role="status" className="rounded-sm bg-cream px-4 py-3 text-sm text-muted">
          Your session has ended. Please sign in again.
        </p>
      )}
      {error && (
        <FormError>
          {error}
        </FormError>
      )}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 w-full rounded-sm border border-line bg-white px-4 text-base outline-none focus:border-gold"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-sm border border-line bg-white pl-4 pr-12 text-base outline-none focus:border-gold"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-foreground"
          >
            {showPassword ? <LuEyeOff className="h-5 w-5" /> : <LuEye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-black text-sm font-medium uppercase tracking-wider text-white transition hover:bg-gold disabled:opacity-60"
      >
        {submitting && <LuLoaderCircle className="h-4 w-4 animate-spin" />}
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
