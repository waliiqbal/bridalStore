"use client";

import { FormError } from "@/shared/components/FormError";
import { EMAIL_PATTERN, PHONE_PATTERN } from "@/shared/lib/validators";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { LuCircleCheck } from "react-icons/lu";
import { ApiError } from "@/infrastructure/http/api-client";
import { Button } from "@/shared/admin/Button";
import { Field, Input, Textarea } from "@/shared/admin/Form";
import { submitEnquiry } from "../api/enquiries.api";
import type { EnquiryOptions } from "../types/enquiries";

interface Props {
  options: EnquiryOptions;
  // From the QR code link (?source=window), so the owner can see where people came from
  source?: string;
  whatsappHref: string | null;
}

type FieldName = "name" | "phone" | "email" | "eventDate";
type Errors = Partial<Record<FieldName | "form", string>>;


// A pill you tap, used for the budget (pick one) and the outfit types (pick any)
function Pill({
  type,
  name,
  checked,
  onChange,
  children,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  children: string;
}) {
  return (
    <label className="cursor-pointer">
      <input type={type} name={name} checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm transition peer-checked:border-black peer-checked:bg-black peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-gold peer-focus-visible:ring-offset-2 hover:border-gold">
        {children}
      </span>
    </label>
  );
}

export function EnquiryForm({ options, source, whatsappHref }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [budget, setBudget] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [outfitTypes, setOutfitTypes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [robotTrap, setRobotTrap] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const clear = (field: FieldName) =>
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));

  const toggleType = (code: string) =>
    setOutfitTypes((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
    );

  async function send(event: FormEvent) {
    event.preventDefault();
    const found: Errors = {};
    if (name.trim().length < 2) found.name = "Please enter your name.";
    if (!PHONE_PATTERN.test(phone.trim())) found.phone = "Please enter a phone number we can reach you on.";
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) found.email = "That email address doesn't look right.";
    // "en-CA" formats as YYYY-MM-DD, in the visitor's own time zone
    if (eventDate && eventDate < new Date().toLocaleDateString("en-CA")) {
      found.eventDate = "Please choose a date that hasn't passed.";
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(`enq-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    setSending(true);
    try {
      await submitEnquiry({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        budget: budget || undefined,
        eventDate: eventDate || undefined,
        outfitTypes: outfitTypes.length > 0 ? outfitTypes : undefined,
        message: message.trim() || undefined,
        source,
        website: robotTrap || undefined,
      });
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErrors({
        form:
          error instanceof ApiError && error.status === 429
            ? "You've sent a few in a row. Please wait a minute and try again."
            : error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
      });
      setSending(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="rounded-sm border border-line bg-cream px-6 py-12 text-center">
        <LuCircleCheck className="mx-auto h-12 w-12 text-gold" aria-hidden />
        <h2 className="mt-4 font-serif text-2xl font-bold sm:text-3xl">
          Thank you, {name.trim().split(" ")[0]}!
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted">
          We have your details and will get in touch soon to help you find the perfect outfit.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center rounded-sm bg-black px-7 text-sm font-medium uppercase tracking-wider text-white transition hover:bg-gold"
            >
              Chat with us on WhatsApp
            </a>
          )}
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-sm border border-line bg-white px-7 text-sm font-medium uppercase tracking-wider transition hover:border-gold hover:text-gold"
          >
            Browse the collection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={send} noValidate className="space-y-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="enq-name" required error={errors.name}>
          <Input
            id="enq-name"
            name="name"
            autoComplete="name"
            maxLength={100}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clear("name");
            }}
            aria-invalid={!!errors.name}
          />
        </Field>
        <Field label="Phone number" htmlFor="enq-phone" required error={errors.phone}>
          <Input
            id="enq-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              clear("phone");
            }}
            aria-invalid={!!errors.phone}
          />
        </Field>
      </div>

      <Field label="Email" htmlFor="enq-email" hint="Optional" error={errors.email}>
        <Input
          id="enq-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={200}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            clear("email");
          }}
          aria-invalid={!!errors.email}
        />
      </Field>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium">What are you looking for?</legend>
        <p className="mb-3 text-xs text-muted">Choose as many as you like.</p>
        <div className="flex flex-wrap gap-2">
          {options.outfitTypes.map((type) => (
            <Pill
              key={type.code}
              type="checkbox"
              name="outfitTypes"
              checked={outfitTypes.includes(type.code)}
              onChange={() => toggleType(type.code)}
            >
              {type.label}
            </Pill>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium">Your budget</legend>
        <div className="flex flex-wrap gap-2">
          {options.budgets.map((choice) => (
            <Pill
              key={choice.code}
              type="radio"
              name="budget"
              checked={budget === choice.code}
              onChange={() => setBudget(choice.code)}
            >
              {choice.label}
            </Pill>
          ))}
        </div>
      </fieldset>

      <Field
        label="Date of your wedding or event"
        htmlFor="enq-eventDate"
        hint="Optional. It helps us plan your outfit in time."
        error={errors.eventDate}
        className="sm:max-w-xs"
      >
        <Input
          id="enq-eventDate"
          name="eventDate"
          type="date"
          value={eventDate}
          onChange={(event) => {
            setEventDate(event.target.value);
            clear("eventDate");
          }}
          aria-invalid={!!errors.eventDate}
        />
      </Field>

      <Field
        label="Anything else we should know?"
        htmlFor="enq-message"
        hint="Optional. Colours, style, sizes, ideas."
      >
        <Textarea
          id="enq-message"
          name="message"
          maxLength={2000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </Field>

      {/* Robot trap: people never see or fill this */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this empty
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={robotTrap}
            onChange={(event) => setRobotTrap(event.target.value)}
          />
        </label>
      </div>

      {errors.form && (
        <FormError>
          {errors.form}
        </FormError>
      )}

      <Button
        type="submit"
        loading={sending}
        className="h-14 w-full text-base uppercase tracking-wider sm:w-auto sm:px-12"
      >
        Send my details
      </Button>
    </form>
  );
}
