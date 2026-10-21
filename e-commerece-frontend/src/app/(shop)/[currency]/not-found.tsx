import Link from "next/link";

export default function ShopNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-sm uppercase tracking-widest text-gold">Page not found</p>
      <h1 className="mt-3 font-serif text-4xl font-bold">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-muted">
        The link may be old, or the page may have moved. Let&apos;s get you back to the shop.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block bg-black px-8 py-3 text-sm font-medium uppercase tracking-wider text-white hover:bg-gold"
      >
        Back to the shop
      </Link>
    </div>
  );
}
