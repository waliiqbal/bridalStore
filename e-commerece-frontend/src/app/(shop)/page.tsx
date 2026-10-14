import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/brand";
import { getSelectedCurrency } from "@/modules/currency/server";
import { getBanners, getPage } from "@/modules/shop/api/page.api";
import { getCategoryTree, getSettings } from "@/modules/shop/api/shop.api";
import { HeroSlider } from "@/modules/shop/components/blocks/HeroSlider";
import { PromoBanners } from "@/modules/shop/components/blocks/PromoBanners";
import { SectionRenderer } from "@/modules/shop/components/blocks/SectionRenderer";
import { plainText } from "@/modules/shop/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { code } = await getSelectedCurrency();
  const page = await getPage("home", code).catch(() => null);
  const description = page?.seoDescription || plainText(page?.content) || undefined;
  return {
    title: page?.seoTitle || { absolute: `${brand.name} | ${brand.tagline}` },
    description,
    alternates: { canonical: "/" },
  };
}

// The homepage is the "home" page the owner builds in the admin: blocks in the order they chose.
// The big pictures at the top are the "Homepage: big banners" from the Banners screen, and the
// promotion banners appear after the first row of picture tiles.
export default async function HomePage() {
  const { code } = await getSelectedCurrency();
  const [page, heroBanners, promoBanners] = await Promise.all([
    getPage("home", code).catch(() => null),
    getBanners("home_hero").catch(() => []),
    getBanners("home_promo").catch(() => []),
  ]);

  const sections = page?.sections ?? [];
  const hasSlides = heroBanners.length > 0;
  // Banners win over a hero block, so the page never shows two big pictures at the top
  const blocks = hasSlides ? sections.filter((section) => section.type !== "HERO_BANNER") : sections;

  if (!hasSlides && blocks.length === 0) return <FallbackHome />;

  const promoAfter = blocks.findIndex((section) => section.type === "COLLECTION_TILES");

  return (
    <div className="pb-16">
      <h1 className="sr-only">{brand.name}</h1>
      {hasSlides && (
        <HeroSlider
          slides={heroBanners.map((banner) => ({
            id: banner.id,
            title: banner.title,
            subtitle: banner.subtitle,
            imageUrl: banner.imageUrl,
            mobileImageUrl: banner.mobileImageUrl,
            linkUrl: banner.linkUrl,
            buttonText: banner.buttonText,
          }))}
        />
      )}
      <div className="mt-10 space-y-14 sm:mt-14 sm:space-y-20">
        {blocks.map((section, index) => (
          <div key={section.id} className="space-y-14 sm:space-y-20">
            <SectionRenderer section={section} />
            {index === promoAfter && <PromoBanners banners={promoBanners} />}
          </div>
        ))}
        {promoAfter === -1 && <PromoBanners banners={promoBanners} />}
      </div>
    </div>
  );
}

// Shown only while the owner has not built a homepage yet: the shop name and the categories.
async function FallbackHome() {
  const [settings, categories] = await Promise.all([
    getSettings().catch(() => null),
    getCategoryTree().catch(() => []),
  ]);
  const tiles = categories.filter((category) => category.showInMenu);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-16 lg:px-6">
      <section className="py-14 text-center sm:py-20">
        <h1 className="font-serif text-4xl font-bold sm:text-5xl">{settings?.storeName ?? brand.name}</h1>
        <p className="mt-3 text-muted">{brand.tagline}</p>
      </section>

      {tiles.length > 0 && (
        <section aria-label="Shop by category">
          <h2 className="mb-5 font-serif text-2xl font-bold">Shop by category</h2>
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {tiles.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="group relative flex aspect-[4/5] items-end overflow-hidden bg-gradient-to-br from-cream to-[#e5d8c3]"
                >
                  {category.imageUrl && (
                    <Image
                      src={category.imageUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  )}
                  <span className="relative w-full bg-gradient-to-t from-black/55 to-transparent px-4 pb-4 pt-12 font-serif text-xl text-white">
                    {category.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
