import type { Metadata } from "next";
import { getSettings } from "@/modules/shop/api/shop.api";
import { getEnquiryOptions } from "@/modules/enquiries/api/enquiry-options.api";
import { EnquiryForm } from "@/modules/enquiries/components/EnquiryForm";
import { whatsappLink } from "@/shared/layouts/whatsapp";

export const metadata: Metadata = {
  title: "Find your outfit",
  description:
    "Tell us about your wedding or event, your budget and the outfit you have in mind, and our team will get in touch to help you find it.",
  alternates: { canonical: "/enquiry" },
};

type Props = { searchParams: Promise<{ source?: string | string[] }> };

// Where the QR code in the shop window leads. Customers tell us what they are looking for and
// the owner follows up from Admin → Enquiries.
export default async function EnquiryPage({ searchParams }: Props) {
  const { source: rawSource } = await searchParams;
  // Only letters, numbers, - and _ (the backend checks again)
  const first = Array.isArray(rawSource) ? rawSource[0] : rawSource;
  const source = first && /^[a-z0-9_-]{1,40}$/i.test(first) ? first : undefined;

  const [options, settings] = await Promise.all([
    getEnquiryOptions().catch(() => null),
    getSettings().catch(() => null),
  ]);
  const whatsappHref = whatsappLink(settings?.whatsappNumber);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-20 pt-10 sm:pt-14">
      <header className="mb-8 text-center">
        <h1 className="font-serif text-3xl font-bold sm:text-4xl">Let us help you find your outfit</h1>
        <p className="mt-3 text-muted">
          Tell us a little about your day and what you have in mind. Our team will get back to you soon.
        </p>
      </header>

      {options ? (
        <EnquiryForm options={options} source={source} whatsappHref={whatsappHref} />
      ) : (
        <div className="rounded-sm border border-line bg-cream px-6 py-10 text-center">
          <p className="font-medium">The form isn&apos;t available right now.</p>
          <p className="mt-1 text-sm text-muted">
            Please try again in a moment{whatsappHref ? " or message us on WhatsApp" : ""}.
          </p>
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-12 items-center rounded-sm bg-black px-7 text-sm font-medium uppercase tracking-wider text-white hover:bg-gold"
            >
              Chat on WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}
