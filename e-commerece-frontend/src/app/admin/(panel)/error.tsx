"use client";

// Shown when the admin panel can't reach the server (not when you're signed out).
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="max-w-md rounded-sm border border-line bg-white p-8 text-center">
        <h1 className="font-serif text-2xl font-bold">We can&apos;t reach the server</h1>
        <p className="mt-2 text-sm text-muted">
          The store system isn&apos;t responding. Please check your internet connection and try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 h-11 rounded-sm bg-black px-6 text-sm font-medium uppercase tracking-wider text-white hover:bg-gold"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
