import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { resolveCurrency } from "@/modules/currency/server";
import { getCategoryPage, resolveRedirect } from "@/modules/shop/api/shop.api";
import { ListingPage } from "@/modules/shop/components/ListingPage";
import { listingMetadata } from "@/modules/shop/lib/listing-metadata";
import { parseListingQuery, type RawParams } from "@/modules/shop/lib/listing-query";
import { plainText } from "@/modules/shop/lib/seo";

type Props = { params: Promise<{ currency: string; slug: string }>; searchParams: Promise<RawParams> };

// Same idea as the collection page: follow a renamed address, otherwise 404.
async function load(currency: string, slug: string, raw: RawParams) {
  const query = parseListingQuery(raw);
  const { code } = await resolveCurrency(currency);
  const data = await getCategoryPage(slug, query, code);
  if (!data) {
    const moved = await resolveRedirect(`/categories/${slug}`);
    if (moved) permanentRedirect(moved.toPath);
    notFound();
  }
  return { data, query };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { currency, slug } = await params;
  const query = parseListingQuery(await searchParams);
  const { code } = await resolveCurrency(currency);
  const data = await getCategoryPage(slug, query, code);
  if (!data) return { title: "Category not found" };

  const { category } = data;
  return listingMetadata({
    title: category.seoTitle || category.name,
    description: category.seoDescription || plainText(category.description) || undefined,
    image: category.imageUrl ?? data.products.items[0]?.images[0]?.url,
    basePath: `/categories/${slug}`,
    query,
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { currency, slug } = await params;
  const { data, query } = await load(currency, slug, await searchParams);
  const { category } = data;

  // Home › parent › … › this category (the last crumb is the page itself)
  const parents = category.breadcrumb
    .slice(0, -1)
    .map((crumb) => ({ name: crumb.name, href: `/categories/${crumb.slug}` }));

  return (
    <ListingPage
      basePath={`/categories/${category.slug}`}
      title={category.name}
      introHtml={category.description}
      bannerUrl={category.imageUrl}
      breadcrumb={[{ name: "Home", href: "/" }, ...parents, { name: category.name }]}
      subcategories={category.children}
      categoryRoot={category.slug}
      listing={data}
      query={query}
    />
  );
}
