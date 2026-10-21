import type { MetadataRoute } from "next";
import { storefrontFetch } from "@/infrastructure/http/storefront-api";
import { absoluteUrl } from "@/modules/shop/lib/seo";

interface SitemapData {
  products: { slug: string; updatedAt: string }[];
  collections: { slug: string; updatedAt: string }[];
  categories: { slug: string; updatedAt: string }[];
  pages: { slug: string; updatedAt: string }[];
}

// Rebuilt at most once an hour, and whenever products, collections, categories or pages change
export const revalidate = 3600;

// sitemap.xml: every public page, so Google finds new products quickly.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await storefrontFetch<SitemapData>("/feeds/sitemap", {
    tags: ["products", "collections", "categories", "pages"],
    revalidate: 3600,
  }).catch(() => null);

  const entry = (path: string, updatedAt?: string, priority?: number): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(path),
    lastModified: updatedAt ? new Date(updatedAt) : undefined,
    priority,
  });

  return [
    entry("/", undefined, 1),
    entry("/enquiry", undefined, 0.4),
    ...(data?.collections.map((c) => entry(`/collections/${c.slug}`, c.updatedAt, 0.8)) ?? []),
    ...(data?.categories.map((c) => entry(`/categories/${c.slug}`, c.updatedAt, 0.7)) ?? []),
    ...(data?.products.map((p) => entry(`/products/${p.slug}`, p.updatedAt, 0.9)) ?? []),
    ...(data?.pages.map((p) => entry(`/pages/${p.slug}`, p.updatedAt, 0.5)) ?? []),
  ];
}
