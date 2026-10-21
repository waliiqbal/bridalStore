import type { Metadata } from "next";
import { ReviewsManager } from "@/modules/reviews/components/ReviewsManager";

export const metadata: Metadata = { title: "Reviews" };

export default function ReviewsPage() {
  return <ReviewsManager />;
}
