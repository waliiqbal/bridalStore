"use client";

import { FormError } from "@/shared/components/FormError";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { LuStar } from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { Field, Input, Textarea } from "@/shared/admin/Form";
import { useShopper } from "@/modules/account/components/ShopperProvider";
import { LOGIN_PATH } from "@/modules/account/constants";
import { submitReview } from "../api/reviews.api";

// "Write a review": only for signed-in customers (one review per product). New reviews wait for
// the owner unless auto-approve is on in Settings, and the customer is told which.
export function ReviewForm({ slug }: { slug: string }) {
  const { customer } = useShopper();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (done) {
    return (
      <p role="status" className="max-w-sm rounded-sm border border-line bg-cream/60 px-4 py-3 text-sm">
        {done}
      </p>
    );
  }

  if (!customer) {
    return (
      <Link
        href={`${LOGIN_PATH}?next=${encodeURIComponent(`/products/${slug}#reviews`)}`}
        className="inline-flex h-11 items-center border border-black px-6 text-sm uppercase tracking-wider hover:bg-black hover:text-white"
      >
        Sign in to write a review
      </Link>
    );
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Write a review
      </Button>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (rating < 1) return setError("Please choose how many stars you give.");
    if (body.trim().length < 10) return setError("Please write at least a short sentence.");
    setError(null);
    setSending(true);
    try {
      const result = await submitReview(slug, { rating, title: title.trim() || null, body: body.trim() });
      setDone(
        result.awaitingApproval
          ? "Thank you! Your review will appear here once we have had a look at it."
          : "Thank you! Your review is now on the page.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't save your review. Please try again.");
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="w-full max-w-lg space-y-4 rounded-sm border border-line bg-white p-4 sm:p-5"
    >
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">
          Your rating<span className="text-red-600"> *</span>
        </legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer p-1">
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="sr-only"
              />
              <span className="sr-only">
                {n} {n === 1 ? "star" : "stars"}
              </span>
              <LuStar
                className={`h-7 w-7 ${n <= rating ? "fill-current text-gold" : "text-line"}`}
                aria-hidden
              />
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Headline" htmlFor="review-title" hint="Optional, for example “Perfect for my Nikah”.">
        <Input id="review-title" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Your review" htmlFor="review-body" required>
        <Textarea
          id="review-body"
          rows={4}
          value={body}
          maxLength={2000}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>
      {error && (
        <FormError>
          {error}
        </FormError>
      )}
      <div className="flex gap-2">
        <Button type="submit" loading={sending}>
          Send review
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
