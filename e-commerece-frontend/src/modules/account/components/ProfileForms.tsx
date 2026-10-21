"use client";

import { PHONE_PATTERN } from "@/shared/lib/validators";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/admin/Button";
import { Field, Input } from "@/shared/admin/Form";
import { changePassword, updateProfile } from "../api/account.api";
import type { Customer } from "../types/account";
import { PasswordInput } from "./PasswordInput";


function Message({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-sm border px-4 py-3 text-sm ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {children}
    </p>
  );
}

export function ProfileForm({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(customer.firstName ?? "");
  const [lastName, setLastName] = useState(customer.lastName ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [marketing, setMarketing] = useState(customer.marketingOptIn);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (phone.trim() && !PHONE_PATTERN.test(phone.trim())) {
      setPhoneError("Please enter a valid phone number.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        phone: phone.trim() || null,
        marketingOptIn: marketing,
      });
      setMessage({ tone: "ok", text: "Your details have been saved." });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="space-y-5 rounded-sm border border-line bg-white p-4 sm:p-6">
      <h3 className="font-serif text-xl font-bold">My details</h3>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" htmlFor="pf-first">
          <Input
            id="pf-first"
            autoComplete="given-name"
            maxLength={80}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </Field>
        <Field label="Last name" htmlFor="pf-last">
          <Input
            id="pf-last"
            autoComplete="family-name"
            maxLength={80}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Email" htmlFor="pf-email" hint="This is how you sign in. To change it, contact us.">
        <Input id="pf-email" value={customer.email} disabled readOnly />
      </Field>
      <Field label="Phone" htmlFor="pf-phone" error={phoneError}>
        <Input
          id="pf-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={24}
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            setPhoneError(null);
          }}
          aria-invalid={!!phoneError}
        />
      </Field>
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={marketing}
          onChange={(event) => setMarketing(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-black"
        />
        <span>Send me news about new arrivals and offers.</span>
      </label>
      {message && <Message tone={message.tone}>{message.text}</Message>}
      <Button type="submit" loading={saving}>
        Save my details
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!current) return setMessage({ tone: "error", text: "Please enter your current password." });
    if (next.length < 8)
      return setMessage({ tone: "error", text: "Your new password must be at least 8 characters." });
    if (next !== again) return setMessage({ tone: "error", text: "The two new passwords don't match." });
    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setAgain("");
      setMessage({
        tone: "ok",
        text: "Your password has been changed. Any other devices have been signed out.",
      });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="space-y-5 rounded-sm border border-line bg-white p-4 sm:p-6">
      <h3 className="font-serif text-xl font-bold">Change password</h3>
      <Field label="Current password" htmlFor="pw-current">
        <PasswordInput
          id="pw-current"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="New password" htmlFor="pw-new" hint="At least 8 characters.">
          <PasswordInput
            id="pw-new"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
          />
        </Field>
        <Field label="Type it again" htmlFor="pw-again">
          <PasswordInput
            id="pw-again"
            autoComplete="new-password"
            value={again}
            onChange={(event) => setAgain(event.target.value)}
          />
        </Field>
      </div>
      {message && <Message tone={message.tone}>{message.text}</Message>}
      <Button type="submit" loading={saving}>
        Change password
      </Button>
    </form>
  );
}
