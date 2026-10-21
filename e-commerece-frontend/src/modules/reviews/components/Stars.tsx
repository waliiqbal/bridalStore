import { LuStar } from "react-icons/lu";

// Five stars, filled up to `rating` (whole stars; shown to screen readers as words)
export function Stars({ rating, className = "h-4 w-4" }: { rating: number; className?: string }) {
  const filled = Math.round(rating);
  return (
    <span
      className="inline-flex items-center gap-0.5 text-gold"
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <LuStar
          key={n}
          className={`${className} ${n <= filled ? "fill-current" : "text-line"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}
