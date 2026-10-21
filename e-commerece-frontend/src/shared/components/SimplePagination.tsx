import Link from "next/link";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

// Previous / Next links for simple lists (search, wishlist, orders). `params` are the other
// things in the address that must be kept, e.g. { q: "lehenga" }.
export function SimplePagination({
  basePath,
  params = {},
  page,
  pageSize,
  total,
}: {
  basePath: string;
  params?: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  if (last <= 1) return null;

  const href = (n: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
    if (n > 1) search.set("page", String(n));
    const text = search.toString();
    return text ? `${basePath}?${text}` : basePath;
  };
  const box =
    "inline-flex h-10 items-center justify-center gap-1 border border-line px-4 text-sm hover:border-gold hover:text-gold";

  return (
    <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-3">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={box}>
          <LuChevronLeft className="h-4 w-4" />
          Previous
        </Link>
      ) : (
        <span className={`${box} pointer-events-none opacity-40`}>
          <LuChevronLeft className="h-4 w-4" />
          Previous
        </span>
      )}
      <span className="text-sm text-muted">
        Page {page} of {last}
      </span>
      {page < last ? (
        <Link href={href(page + 1)} rel="next" className={box}>
          Next
          <LuChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={`${box} pointer-events-none opacity-40`}>
          Next
          <LuChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
