import type { Metadata } from "next";
import { getSettings } from "@/modules/shop/api/shop.api";
import { getEnquiryOptions } from "@/modules/enquiries/api/enquiry-options.api";
import { EnquiryForm } from "@/modules/enquiries/components/EnquiryForm";
import { DEFAULT_ENQUIRY_OPTIONS } from "@/modules/enquiries/lib/default-options";
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

      {/* If the shop's server can't be reached the form still shows; sending then says so */}
      <EnquiryForm options={options ?? DEFAULT_ENQUIRY_OPTIONS} source={source} whatsappHref={whatsappHref} />
    </div>
  );
}
