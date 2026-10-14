import Link from "next/link";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { buildHref, withPage, type ListingQuery } from "../lib/listing-query";

// 1 … 4 [5] 6 … 12
function pageNumbers(current: number, last: number): (number | "gap")[] {
  const wanted = new Set([1, last, current - 1, current, current + 1]);
  const pages = [...wanted].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

export function Pagination({
  basePath,
  query,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  query: ListingQuery;
  page: number;
  pageSize: number;
  total: number;
}) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  if (last <= 1) return null;
  const href = (n: number) => buildHref(basePath, withPage(query, n));
  const box = "flex h-10 min-w-10 items-center justify-center border px-3 text-sm";

  return (
    <nav aria-label="Pages" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link
          href={href(page - 1)}
          rel="prev"
          aria-label="Previous page"
          className={`${box} border-line hover:border-gold`}
        >
          <LuChevronLeft className="h-4 w-4" />
        </Link>
      )}
      {pageNumbers(page, last).map((n, i) =>
        n === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={n}
            href={href(n)}
            aria-current={n === page ? "page" : undefined}
            className={`${box} ${n === page ? "border-black bg-black text-white" : "border-line hover:border-gold"}`}
          >
            {n}
          </Link>
        ),
      )}
      {page < last && (
        <Link
          href={href(page + 1)}
          rel="next"
          aria-label="Next page"
          className={`${box} border-line hover:border-gold`}
        >
          <LuChevronRight className="h-4 w-4" />
        </Link>
      )}
    </nav>
  );
}
