import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getSelectedCurrency } from "@/modules/currency/server";
import { getCollectionPage, resolveRedirect } from "@/modules/shop/api/shop.api";
import { ListingPage } from "@/modules/shop/components/ListingPage";
import { listingMetadata } from "@/modules/shop/lib/listing-metadata";
import { parseListingQuery, type RawParams } from "@/modules/shop/lib/listing-query";
import { plainText } from "@/modules/shop/lib/seo";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> };

// Load the collection page. If the address used to belong to a renamed collection, send the
// visitor to the new one; otherwise it's a real 404.
async function load(slug: string, raw: RawParams) {
  const query = parseListingQuery(raw);
  const { code } = await getSelectedCurrency();
  const data = await getCollectionPage(slug, query, code);
  if (!data) {
    const moved = await resolveRedirect(`/collections/${slug}`);
    if (moved) permanentRedirect(moved.toPath);
    notFound();
  }
  return { data, query };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const query = parseListingQuery(await searchParams);
  const { code } = await getSelectedCurrency();
  const data = await getCollectionPage(slug, query, code);
  if (!data) return { title: "Collection not found" };

  const { collection } = data;
  return listingMetadata({
    title: collection.seoTitle || collection.title,
    description: collection.seoDescription || plainText(collection.description) || undefined,
    image: collection.bannerImageUrl ?? data.products.items[0]?.images[0]?.url,
    basePath: `/collections/${slug}`,
    query,
  });
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { data, query } = await load(slug, await searchParams);
  const { collection } = data;

  return (
    <ListingPage
      basePath={`/collections/${collection.slug}`}
      title={collection.title}
      introHtml={collection.description}
      noticeText={collection.noticeText}
      seoHtml={collection.seoContent}
      bannerUrl={collection.bannerImageUrl}
      mobileBannerUrl={collection.mobileBannerImageUrl}
      breadcrumb={[{ name: "Home", href: "/" }, { name: collection.title }]}
      listing={data}
      query={query}
    />
  );
}
