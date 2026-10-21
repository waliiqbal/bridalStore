import { formatDate } from "@/shared/lib/date";
import { getProductReviews } from "../api/reviews.api";
import { ReviewForm } from "./ReviewForm";
import { Stars } from "./Stars";

// The "Reviews" block under a product. Server-rendered so Google can read it;
// only the "Write a review" form is interactive.
export async function ProductReviews({ slug }: { slug: string }) {
  const data = await getProductReviews(slug).catch(() => null);
  if (!data) return null;
  const { items, total, summary } = data;

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="mt-14 border-t border-line pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="reviews-heading" className="font-display text-2xl">
            Customer reviews
          </h2>
          {summary.average !== null ? (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <Stars rating={summary.average} className="h-5 w-5" />
              <span className="font-medium">{summary.average.toFixed(1)}</span>
              <span className="text-muted">
                from {summary.count} {summary.count === 1 ? "review" : "reviews"}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">No reviews yet. Be the first to share what you think.</p>
          )}
        </div>
        <ReviewForm slug={slug} />
      </div>

      {items.length > 0 && (
        <ul className="mt-8 divide-y divide-line">
          {items.map((review) => (
            <li key={review.id} className="py-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Stars rating={review.rating} />
                <span className="text-sm font-medium">{review.authorName}</span>
                {review.isVerified && <span className="text-xs text-gold">Verified purchase</span>}
                <span className="text-xs text-muted">{formatDate(review.createdAt)}</span>
              </div>
              {review.title && <p className="mt-2 font-medium">{review.title}</p>}
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{review.body}</p>
              {review.shopReply && (
                <p className="mt-3 border-l-2 border-gold bg-cream/60 px-3 py-2 text-sm">
                  <span className="font-medium">Reply from the shop: </span>
                  {review.shopReply}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {total > items.length && (
        <p className="mt-4 text-sm text-muted">
          Showing the {items.length} newest of {total} reviews.
        </p>
      )}
    </section>
  );
}
