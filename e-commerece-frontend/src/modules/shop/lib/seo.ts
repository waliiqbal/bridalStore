import { env } from "@/config/env";

export const absoluteUrl = (path: string): string =>
  `${env.siteUrl}${path.startsWith("/") ? path : `/${path}`}`;

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

// JSON for a <script type="application/ld+json">. "<" is escaped so no text can close the tag.
export const jsonLdString = (data: unknown): string => JSON.stringify(data).replace(/</g, "\\u003c");

// Plain text for page descriptions from the owner's HTML
export function plainText(html: string | null | undefined, max = 160): string {
  const text = (html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
