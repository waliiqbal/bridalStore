// Typed access to environment variables. Use this instead of process.env.
export const env = {
  // Must end with /api, no trailing slash. When NEXT_PUBLIC_API_URL is "/api" (API reached through
  // this site, see next.config.ts), the server can't use a relative address, so it calls API_URL.
  apiUrl: (
    (typeof window === "undefined" && process.env.API_URL) ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3000/api"
  ).replace(/\/+$/, ""),
  // Public address of this website: canonical links and search-engine data
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/+$/, ""),
  // Server only: the secret the backend sends when it asks this site to refresh cached pages
  revalidateSecret: process.env.REVALIDATE_SECRET ?? "",
};
