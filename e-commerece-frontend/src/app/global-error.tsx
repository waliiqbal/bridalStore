"use client";

// The last safety net: shown only if the page's own layout crashes (the shop and account pages
// have friendlier error pages). It replaces the whole page, so it brings its own <html> and <body>.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <main style={{ maxWidth: 520, margin: "0 auto", padding: "96px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>We&apos;re having a little trouble</h1>
          <p style={{ color: "#666", marginTop: 12 }}>Something went wrong. Please try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 32,
              padding: "12px 32px",
              background: "#000",
              color: "#fff",
              border: 0,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
