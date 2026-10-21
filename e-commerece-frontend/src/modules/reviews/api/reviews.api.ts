import { apiFetch } from "@/infrastructure/http/api-client";
import { storefrontFetch } from "@/infrastructure/http/storefront-api";
import type { PublicReview, ReviewInput, ReviewList } from "../types/reviews";

// Server-side read for the product page. It is cached and refreshed with the product's own tag,
// so approving or hiding a review updates the page straight away.
export const getProductReviews = (slug: string) =>
  storefrontFetch<ReviewList>(`/products/${encodeURIComponent(slug)}/reviews?pageSize=20`, {
    tags: [`product:${slug}`],
  });

// Browser-side: a signed-in customer writes a review
export const submitReview = (slug: string, input: ReviewInput) =>
  apiFetch<{ review: PublicReview; awaitingApproval: boolean }>(
    `/products/${encodeURIComponent(slug)}/reviews`,
    { method: "POST", body: input },
  );
