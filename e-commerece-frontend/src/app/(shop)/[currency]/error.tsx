"use client";

// Shown when the shop can't load its data (for example the server is down). Not for missing pages.
export default function ShopError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-serif text-3xl font-bold">We&apos;re having a little trouble</h1>
      <p className="mt-3 text-muted">The shop couldn&apos;t load just now. Please try again in a moment.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 bg-black px-8 py-3 text-sm font-medium uppercase tracking-wider text-white hover:bg-gold"
      >
        Try again
      </button>
    </div>
  );
}
