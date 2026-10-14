import { LuChevronDown } from "react-icons/lu";
import { jsonLdString } from "../lib/seo";
import type { PublicFaq } from "../types/page";

// The questions and answers. Each folds open. Adds "FAQ" data for Google and AI search, which can
// then quote the owner's answers.
export function FaqBlock({
  title,
  subtitle,
  faqs,
  withJsonLd = true,
}: {
  title: string | null;
  subtitle: string | null;
  faqs: PublicFaq[];
  withJsonLd?: boolean;
}) {
  if (faqs.length === 0) return null;

  const plain = (html: string) =>
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: plain(faq.answer) },
    })),
  };

  return (
    <section className="mx-auto w-full max-w-3xl">
      {withJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      )}
      {title && <h2 className="font-serif text-2xl font-bold sm:text-3xl">{title}</h2>}
      {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
      <div className="mt-6 border-t border-line">
        {faqs.map((faq) => (
          <details key={faq.id} className="group border-b border-line py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
              {faq.question}
              <LuChevronDown className="h-5 w-5 shrink-0 transition group-open:rotate-180" aria-hidden />
            </summary>
            <div className="richtext mt-3 text-sm" dangerouslySetInnerHTML={{ __html: faq.answer }} />
          </details>
        ))}
      </div>
    </section>
  );
}
