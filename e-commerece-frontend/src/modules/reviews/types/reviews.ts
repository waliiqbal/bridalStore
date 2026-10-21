// Must match the backend review DTOs (modules/reviews).

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

// { count, average }. `average` is null until the first approved review
export interface RatingSummary {
  count: number;
  average: number | null;
}

export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  isVerified: boolean;
  shopReply: string | null;
  createdAt: string;
}

export interface ReviewList {
  items: PublicReview[];
  total: number;
  page: number;
  pageSize: number;
  summary: RatingSummary;
}

export interface AdminReview extends PublicReview {
  status: ReviewStatus;
  updatedAt: string;
  customer: { email: string } | null;
  product: { id: string; name: string; slug: string };
}

export type ReviewCounts = Record<ReviewStatus, number>;

export interface ReviewInput {
  rating: number;
  title?: string | null;
  body: string;
}
