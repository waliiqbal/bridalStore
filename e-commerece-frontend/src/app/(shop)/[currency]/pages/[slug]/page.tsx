import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { resolveCurrency } from "@/modules/currency/server";
import { resolveRedirect } from "@/modules/shop/api/shop.api";
import { getPage } from "@/modules/shop/api/page.api";
import { Breadcrumbs } from "@/modules/shop/components/Breadcrumbs";
import { FaqBlock } from "@/modules/shop/components/FaqBlock";
import { SectionRenderer } from "@/modules/shop/components/blocks/SectionRenderer";
import { absoluteUrl, breadcrumbJsonLd, jsonLdString, plainText } from "@/modules/shop/lib/seo";

type Props = { params: Promise<{ currency: string; slug: string }> };

async function load(currency: string, slug: string) {
  // The homepage lives at "/", not "/pages/home"
  if (slug === "home") permanentRedirect("/");
  const { code } = await resolveCurrency(currency);
  const page = await getPage(slug, code);
  if (!page) {
    const moved = await resolveRedirect(`/pages/${slug}`);
    if (moved) permanentRedirect(moved.toPath);
    notFound();
  }
  return page;
}

// Nothing is built ahead of time, but each page is built the first time someone opens it and then
// kept ready for everyone (it is rebuilt when the owner changes it). Without this line every visit
// would build the page again.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { currency, slug } = await params;
  if (slug === "home") return {};
  const { code } = await resolveCurrency(currency);
  const page = await getPage(slug, code);
  if (!page) return { title: "Page not found" };
  const description = page.seoDescription || plainText(page.content) || undefined;
  return {
    title: page.seoTitle || page.title,
    description,
    alternates: { canonical: `/pages/${slug}` },
    openGraph: { type: "website", title: page.title, description, url: absoluteUrl(`/pages/${slug}`) },
  };
}

// An owner-built page: About us, Shipping, Returns, Contact, FAQs and so on.
// Every block type can be used here, same as on the homepage.
export default async function CmsPage({ params }: Props) {
  const { currency, slug } = await params;
  const page = await load(currency, slug);
  const path = `/pages/${page.slug}`;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-20 lg:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: page.title, path },
            ]),
          ),
        }}
      />
      <Breadcrumbs trail={[{ name: "Home", href: "/" }, { name: page.title }]} />

      <h1 className="mb-6 font-serif text-3xl font-bold sm:text-4xl">{page.title}</h1>

      {page.content && (
        <div className="richtext max-w-3xl" dangerouslySetInnerHTML={{ __html: page.content }} />
      )}

      <div className="mt-10 space-y-14">
        {page.sections.map((section) => {
          if (section.type === "FAQ") {
            return (
              <FaqBlock
                key={section.id}
                title={section.title}
                subtitle={section.subtitle}
                faqs={section.faqs ?? []}
              />
            );
          }
          if (section.type === "RICH_TEXT" && section.body) {
            return (
              <section key={section.id} className="max-w-3xl">
                {section.title && <h2 className="mb-3 font-serif text-2xl font-bold">{section.title}</h2>}
                <div className="richtext" dangerouslySetInnerHTML={{ __html: section.body }} />
              </section>
            );
          }
          // Picture, product and tile blocks fill the width, so pull them out of the text column
          return (
            <div key={section.id} className="-mx-4 lg:-mx-6">
              <SectionRenderer section={section} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
