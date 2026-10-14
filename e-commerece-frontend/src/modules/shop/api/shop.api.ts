import { storefrontFetch, storefrontFetchOrNull } from "@/infrastructure/http/storefront-api";
import { toApiParams, type ListingQuery } from "../lib/listing-query";
import type {
  CategoryPageData,
  CategoryTreeNode,
  CollectionPageData,
  CurrencyOption,
  ProductDetail,
  PublicMenu,
  StoreSettings,
} from "../types/shop";

// Server-side reads for the public shop. Tags follow CLAUDE.md ("Storefront cache tags"), so an
// admin change refreshes exactly what shows it. Menus also depend on collections, categories
// and pages (an item whose target is hidden disappears from the menu).

const LONG = 300;

export const getSettings = () =>
  storefrontFetch<StoreSettings>("/settings", { tags: ["settings"], revalidate: LONG });

export const getMenu = (handle: "main" | "footer") =>
  storefrontFetchOrNull<PublicMenu>(`/menus/${handle}`, {
    tags: [`menu:${handle}`, "collections", "categories", "pages"],
    revalidate: LONG,
  });

export const getCategoryTree = () =>
  storefrontFetch<CategoryTreeNode[]>("/categories", { tags: ["categories"], revalidate: LONG });

export const getCurrencies = () =>
  storefrontFetch<CurrencyOption[]>("/currencies", { tags: ["currencies"], revalidate: LONG });

export const getCollectionPage = (slug: string, query: ListingQuery, currency: string) =>
  storefrontFetchOrNull<CollectionPageData>(
    `/collections/${encodeURIComponent(slug)}${toApiParams(query, currency)}`,
    { tags: [`collection:${slug}`, "collections", "products", "categories"] },
  );

export const getCategoryPage = (slug: string, query: ListingQuery, currency: string) =>
  storefrontFetchOrNull<CategoryPageData>(
    `/categories/${encodeURIComponent(slug)}${toApiParams(query, currency)}`,
    { tags: [`category:${slug}`, "categories", "products"] },
  );

export const getProduct = (slug: string, currency: string) =>
  storefrontFetchOrNull<ProductDetail>(
    `/products/${encodeURIComponent(slug)}?currency=${encodeURIComponent(currency)}`,
    { tags: [`product:${slug}`, "products", "categories"] },
  );

// A page that moved: where it lives now (null = it never existed)
export const resolveRedirect = (path: string) =>
  storefrontFetchOrNull<{ toPath: string; statusCode: number }>(
    `/redirects/resolve?path=${encodeURIComponent(path)}`,
    { tags: ["redirects"], revalidate: LONG },
  );
