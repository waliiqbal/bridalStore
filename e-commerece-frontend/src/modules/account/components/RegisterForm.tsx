"use client";

import { FormError } from "@/shared/components/FormError";
import { EMAIL_PATTERN } from "@/shared/lib/validators";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LuMailCheck } from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { Field, Input } from "@/shared/admin/Form";
import { register } from "../api/account.api";
import { sessionHint } from "../hint";
import { useShopper } from "./ShopperProvider";
import { PasswordInput } from "./PasswordInput";


export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const { refresh } = useShopper();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [sending, setSending] = useState(false);
  const [checkEmail, setCheckEmail] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found: typeof errors = {};
    if (!EMAIL_PATTERN.test(email.trim())) found.email = "Please enter a valid email address.";
    if (password.length < 8) found.password = "Your password must be at least 8 characters.";
    setErrors(found);
    if (found.email || found.password) return;

    setSending(true);
    try {
      const result = await register({
        email: email.trim(),
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        marketingOptIn: marketing,
      });
      if (result.status === "CHECK_EMAIL") {
        setCheckEmail(
          result.message ?? "We have sent you an email with a link to finish creating your account.",
        );
        return;
      }
      sessionHint.set();
      await refresh();
      router.replace(next);
      router.refresh();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong. Please try again." });
      setSending(false);
    }
  }

  if (checkEmail) {
    return (
      <div role="status" className="py-4 text-center">
        <LuMailCheck className="mx-auto h-12 w-12 text-gold" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl font-bold">Check your email</h2>
        <p className="mt-3 text-muted">{checkEmail}</p>
        <p className="mt-3 text-sm text-muted">
          You have ordered with us before, so we need to confirm this email address is yours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" htmlFor="reg-first">
          <Input
            id="reg-first"
            autoComplete="given-name"
            maxLength={80}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </Field>
        <Field label="Last name" htmlFor="reg-last">
          <Input
            id="reg-last"
            autoComplete="family-name"
            maxLength={80}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Email" htmlFor="reg-email" required error={errors.email}>
        <Input
          id="reg-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setErrors((current) => ({ ...current, email: undefined }));
          }}
          aria-invalid={!!errors.email}
        />
      </Field>
      <Field
        label="Password"
        htmlFor="reg-password"
        required
        hint="At least 8 characters."
        error={errors.password}
      >
        <PasswordInput
          id="reg-password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          aria-invalid={!!errors.password}
        />
      </Field>
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={marketing}
          onChange={(event) => setMarketing(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-black"
        />
        <span>Send me news about new arrivals and offers. (Optional. You can change this any time.)</span>
      </label>
      {errors.form && (
        <FormError>
          {errors.form}
        </FormError>
      )}
      <Button type="submit" loading={sending} className="h-12 w-full uppercase tracking-wider">
        Create account
      </Button>
    </form>
  );
}
