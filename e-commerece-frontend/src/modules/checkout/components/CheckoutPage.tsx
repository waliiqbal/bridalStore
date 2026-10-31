"use client";

import { FormError } from "@/shared/components/FormError";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuChevronDown } from "react-icons/lu";
import { formatMoney } from "@/shared/lib/money";
import { Button } from "@/shared/admin/Button";
import { Field, Textarea } from "@/shared/admin/Form";
import { LoadingRegion, Skeleton } from "@/shared/components/Skeletons";
import { EMAIL_PATTERN } from "@/shared/lib/validators";
import { listAddresses } from "@/modules/account/api/account.api";
import {
  cleanAddress,
  EMPTY_ADDRESS,
  validateAddress,
  type AddressErrors,
} from "@/modules/account/components/AddressFields";
import { useShopper } from "@/modules/account/components/ShopperProvider";
import type { Address, AddressInput } from "@/modules/account/types/account";
import { getCart, getShippingOptions } from "@/modules/cart/api/cart.api";
import { CartLineList } from "@/modules/cart/components/CartLineList";
import { useCart } from "@/modules/cart/components/CartProvider";
import { CartSummary } from "@/modules/cart/components/CartSummary";
import { CouponForm } from "@/modules/cart/components/CouponForm";
import { EmptyBag } from "@/modules/cart/components/EmptyBag";
import type { CartView, ShippingOptions } from "@/modules/cart/types/cart";
import { placeOrder, problemsFrom } from "../api/checkout.api";
import { trackInitiateCheckout } from "@/modules/tracking/lib/track";
import { newIdempotencyKey } from "../lib/idempotency";
import type { CheckoutInput, CheckoutProblem, PaymentResult, PlacedOrder } from "../types/checkout";
import { ContactSection } from "./ContactSection";
import { DeliverySection, NEW_ADDRESS } from "./DeliverySection";
import { PaymentSection } from "./PaymentSection";
import { ShippingMethodSection } from "./ShippingMethodSection";

type FormErrors = { email?: string; address: AddressErrors; shipping?: string };
const NO_ERRORS: FormErrors = { address: {} };

// The checkout: contact, delivery address, shipping, then payment. The order summary on the right
// is priced by the server for the chosen country and shipping, so the total shown is the real one.
export function CheckoutPage({ currency }: { currency: string }) {
  const router = useRouter();
  const { customer } = useShopper();
  const { cart, ready, refresh: refreshBag } = useCart();

  const [email, setEmail] = useState("");
  const [address, setAddress] = useState<AddressInput>(EMPTY_ADDRESS);
  const [saved, setSaved] = useState<Address[]>([]);
  // A saved address's id, or NEW_ADDRESS
  const [choice, setChoice] = useState<string>(NEW_ADDRESS);
  const [shipping, setShipping] = useState<ShippingOptions | null>(null);
  const [rateId, setRateId] = useState<string | null>(null);
  const [priced, setPriced] = useState<CartView | null>(null);
  const [note, setNote] = useState("");
  const [marketing, setMarketing] = useState(false);
  // Phones only: the order summary sits above the form, folded into one line until opened
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [problems, setProblems] = useState<CheckoutProblem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const attemptKey = useRef(newIdempotencyKey());

  // A signed-in customer's saved addresses (the default one is chosen to start with)
  const customerId = customer?.id;
  useEffect(() => {
    if (!customerId) return;
    let current = true;
    listAddresses()
      .then((list) => {
        if (!current) return;
        setSaved(list);
        const preferred = list.find((a) => a.isDefault) ?? list[0];
        if (preferred) setChoice(preferred.id);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [customerId]);

  const country =
    (choice === NEW_ADDRESS ? address.countryCode : saved.find((a) => a.id === choice)?.countryCode) ?? "AU";
  const hasItems = !!cart && cart.items.length > 0;

  // Tell Meta and Google the customer reached checkout (once per visit to this page)
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (!cart || cart.items.length === 0 || checkoutTracked.current) return;
    checkoutTracked.current = true;
    trackInitiateCheckout(
      cart.items.map((i) => ({ sku: i.sku, name: i.product.name, unitPrice: i.unitPrice.amount, quantity: i.quantity })),
      cart.currencyCode,
    );
  }, [cart]);

  // The shipping choices for the country
  useEffect(() => {
    if (!hasItems) return;
    let current = true;
    getShippingOptions(country, currency)
      .then((result) => {
        if (!current) return;
        setShipping(result);
        // Keep the chosen option if this country has it, otherwise start with the first
        setRateId((existing) =>
          result.options.some((o) => o.id === existing) ? existing : (result.options[0]?.id ?? null),
        );
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [country, currency, hasItems]);

  // The bag priced for this country and shipping choice (and any discount code)
  const couponCode = cart?.coupon?.code;
  const itemCount = cart?.itemCount ?? 0;
  useEffect(() => {
    if (!hasItems) return;
    let current = true;
    getCart({ currency, country, shippingRateId: rateId ?? undefined })
      .then((view) => current && setPriced(view))
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [country, currency, rateId, couponCode, itemCount, hasItems]);

  const setField = <K extends keyof AddressInput>(key: K, value: AddressInput[K]) => {
    setAddress((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, address: { ...current.address, [key]: undefined } }));
  };

  async function continueToPayment() {
    const found: FormErrors = { address: {} };
    if (!customer && !EMAIL_PATTERN.test(email.trim())) found.email = "Please enter a valid email address.";
    if (choice === NEW_ADDRESS) found.address = validateAddress(address);
    if (!rateId) found.shipping = "Please choose a shipping option.";
    setErrors(found);
    if (found.email || Object.keys(found.address).length > 0 || found.shipping) {
      const first = found.email
        ? "checkout-email"
        : Object.keys(found.address).length > 0
          ? "ship-name"
          : null;
      if (first) document.getElementById(first)?.focus();
      return;
    }

    const body: CheckoutInput = {
      ...(customer ? {} : { email: email.trim() }),
      currency,
      shippingRateId: rateId ?? undefined,
      customerNote: note.trim() || null,
      marketingOptIn: customer ? undefined : marketing,
      ...(choice === NEW_ADDRESS ? { shippingAddress: cleanAddress(address) } : { addressId: choice }),
    };

    setPlacing(true);
    setProblems([]);
    setFormError(null);
    try {
      setPlaced(await placeOrder(body, attemptKey.current));
    } catch (error) {
      const list = problemsFrom(error);
      if (list) {
        setProblems(list);
        await refreshBag();
      } else {
        setFormError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      }
    } finally {
      setPlacing(false);
    }
  }

  // Let the customer change their details: a new attempt makes a new order (the old unpaid one is cancelled)
  function editDetails() {
    attemptKey.current = newIdempotencyKey();
    setPlaced(null);
  }

  async function paid(result: PaymentResult) {
    await refreshBag();
    router.push(`/checkout/success?order=${encodeURIComponent(result.order.orderNumber)}`);
  }

  if (!ready) {
    return (
      <LoadingRegion label="Loading checkout">
        <Skeleton className="h-64 w-full" />
      </LoadingRegion>
    );
  }
  if (!hasItems) return <EmptyBag />;

  const view = priced ?? cart;
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-14">
      <div className="space-y-10">
        {problems.length > 0 && (
          <div
            role="alert"
            className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <p className="font-medium">Please check these before paying:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {problems.map((p, i) => (
                <li key={`${p.code}-${i}`}>{p.message}</li>
              ))}
            </ul>
            <Link href="/cart" className="mt-2 inline-block underline underline-offset-4">
              Go to your bag
            </Link>
          </div>
        )}

        <fieldset disabled={!!placed} className="min-w-0 space-y-10 disabled:opacity-60">
          <ContactSection
            signedInEmail={customer?.email ?? null}
            email={email}
            onEmail={(value) => {
              setEmail(value);
              setErrors((current) => ({ ...current, email: undefined }));
            }}
            emailError={errors.email}
          />
          <DeliverySection
            saved={saved}
            choice={choice}
            onChoice={setChoice}
            address={address}
            onAddressChange={setField}
            errors={errors.address}
          />
          <ShippingMethodSection
            shipping={shipping}
            loading={!shipping}
            chosen={rateId}
            onChoose={(id) => {
              setRateId(id);
              setErrors((current) => ({ ...current, shipping: undefined }));
            }}
            error={errors.shipping}
          />
          <Field
            label="Anything we should know?"
            htmlFor="checkout-note"
            hint="Optional. For example your event date."
          >
            <Textarea
              id="checkout-note"
              maxLength={1000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
          {!customer && (
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(event) => setMarketing(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-black"
              />
              <span>Send me news about new arrivals and offers. (Optional)</span>
            </label>
          )}
        </fieldset>

        {formError && (
          <FormError>
            {formError}
          </FormError>
        )}

        {placed ? (
          <>
            <PaymentSection placed={placed} onPaid={paid} />
            <button
              type="button"
              onClick={editDetails}
              className="text-sm text-muted underline underline-offset-4 hover:text-gold"
            >
              Change my details
            </button>
          </>
        ) : (
          <Button
            onClick={continueToPayment}
            loading={placing}
            disabled={!cart.canCheckout}
            className="h-14 w-full text-sm uppercase tracking-wider"
          >
            Continue to payment
          </Button>
        )}
      </div>

      <aside
        aria-labelledby="summary-heading"
        className="order-first h-fit rounded-sm border border-line bg-white p-5 lg:sticky lg:top-32 lg:order-0"
      >
        <h2 id="summary-heading" className="font-serif text-xl font-bold">
          {/* On phones the heading is a button that opens the summary; the total is always visible */}
          <button
            type="button"
            onClick={() => setSummaryOpen((open) => !open)}
            aria-expanded={summaryOpen}
            aria-controls="summary-body"
            className="flex w-full items-center justify-between gap-3 text-left lg:hidden"
          >
            <span className="flex items-center gap-1.5">
              Order summary
              <LuChevronDown
                aria-hidden
                className={`h-5 w-5 transition-transform ${summaryOpen ? "rotate-180" : ""}`}
              />
            </span>
            {view && <span className="font-sans text-base font-semibold">{formatMoney(view.totals.total)}</span>}
          </button>
          <span className="hidden lg:inline">Order summary</span>
        </h2>
        <div id="summary-body" className={`mt-5 space-y-5 ${summaryOpen ? "" : "hidden"} lg:block`}>
          {view && <CartLineList cart={view} editable={false} />}
          {!placed && <CouponForm />}
          {view && <CartSummary cart={view} />}
          <Link href="/cart" className="block text-center text-sm underline underline-offset-4 hover:text-gold">
            Edit your bag
          </Link>
        </div>
      </aside>
    </div>
  );
}
