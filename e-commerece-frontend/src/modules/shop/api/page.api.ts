import { storefrontFetch, storefrontFetchOrNull } from "@/infrastructure/http/storefront-api";
import type { PublicBanner, PublicPage } from "../types/page";

// An owner-built page. It shows products, collections and questions too, so it refreshes
// when any of those change (CLAUDE.md: tags page:<slug>, pages, faqs, collections, products).
export const getPage = (slug: string, currency: string) =>
  storefrontFetchOrNull<PublicPage>(
    `/pages/${encodeURIComponent(slug)}?currency=${encodeURIComponent(currency)}`,
    {
      tags: [`page:${slug}`, "pages", "faqs", "collections", "products"],
    },
  );

// Banners that are switched on and inside their start and end dates right now.
// "revalidate" is short because a scheduled banner appears/disappears by the clock, not by an edit.
export const getBanners = (placement: "home_hero" | "home_promo") =>
  storefrontFetch<PublicBanner[]>(`/banners?placement=${placement}`, { tags: ["banners"], revalidate: 60 });
