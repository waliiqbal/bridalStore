"use client";

import Link from "next/link";
import { Field, Input } from "@/shared/admin/Form";

// Step 1: how we reach the customer. A signed-in customer's account email is used; a guest types one.
// The phone number is asked once, with the delivery address (the order uses the address's phone).
export function ContactSection({
  signedInEmail,
  email,
  onEmail,
  emailError,
}: {
  signedInEmail: string | null;
  email: string;
  onEmail: (value: string) => void;
  emailError?: string;
}) {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-1 font-serif text-xl font-bold">Contact</legend>
      {signedInEmail ? (
        <p className="text-sm">
          Signed in as <strong>{signedInEmail}</strong>. Your order confirmation will be sent there.
        </p>
      ) : (
        <>
          <Field
            label="Email"
            htmlFor="checkout-email"
            required
            error={emailError}
            hint="We send your order confirmation here."
          >
            <Input
              id="checkout-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(event) => onEmail(event.target.value)}
              aria-invalid={!!emailError}
            />
          </Field>
          <p className="-mt-2 text-sm text-muted">
            Have an account?{" "}
            <Link href="/login?next=%2Fcheckout" className="underline underline-offset-4 hover:text-gold">
              Sign in
            </Link>{" "}
            to use your saved addresses. No account is needed to order.
          </p>
        </>
      )}
    </fieldset>
  );
}
