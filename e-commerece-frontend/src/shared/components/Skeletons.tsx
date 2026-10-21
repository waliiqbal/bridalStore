// Grey placeholder shapes shown while a private page's data is loading (search, wishlist and the
// account pages have loading.tsx files that use these). They keep the page the same shape as
// the finished page, so nothing jumps when it appears.
//
// Public pages (collections, products, CMS pages) deliberately have NO loading screen: one makes
// the server answer "200 OK" before it knows whether the address moved or doesn't exist, and
// Google needs the real 301 / 404 for those.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`bg-cream motion-safe:animate-pulse ${className}`} />;
}

// Announces "Loading" to screen readers; the grey shapes themselves are hidden from them.
export function LoadingRegion({
  label = "Loading",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-9 sm:grid-cols-3 sm:gap-x-4 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <Skeleton className="aspect-[3/4]" />
          <Skeleton className="mt-3 h-4 w-4/5" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </li>
      ))}
    </ul>
  );
}

// Search, wishlist: a title and a grid
export function TitleAndGridSkeleton() {
  return (
    <LoadingRegion>
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-16 pt-8 lg:px-6">
        <Skeleton className="mx-auto h-9 w-64" />
        <div className="mt-10">
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    </LoadingRegion>
  );
}

// A list of rows (account pages)
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <LoadingRegion>
      <Skeleton className="mb-5 h-8 w-48" />
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    </LoadingRegion>
  );
}
