import Link from "next/link";
import { LuX } from "react-icons/lu";
import {
  buildHref,
  clearFilters,
  hasFilters,
  toggleFlag,
  toggleValue,
  withoutPrice,
  type ListingQuery,
} from "../lib/listing-query";
import type { Facets } from "../types/shop";

// The choices the shopper has made, each with an × to undo it
export function ActiveFilters({
  basePath,
  query,
  facets,
}: {
  basePath: string;
  query: ListingQuery;
  facets: Facets;
}) {
  if (!hasFilters(query)) return null;

  const chips: { label: string; href: string }[] = [];
  const link = (next: ListingQuery) => buildHref(basePath, next);

  for (const slug of query.category) {
    const name = facets.categories.find((c) => c.slug === slug)?.name ?? slug;
    chips.push({ label: name, href: link(toggleValue(query, "category", slug)) });
  }
  for (const pair of query.attr) {
    const [attrSlug, valueSlug] = pair.split(".");
    const attribute = facets.attributes.find((a) => a.slug === attrSlug);
    const value = attribute?.values.find((v) => v.slug === valueSlug)?.value ?? valueSlug;
    chips.push({
      label: `${attribute?.name ?? attrSlug}: ${value}`,
      href: link(toggleValue(query, "attr", pair)),
    });
  }
  for (const size of query.size)
    chips.push({ label: `Size ${size}`, href: link(toggleValue(query, "size", size)) });
  for (const colour of query.colour)
    chips.push({ label: colour, href: link(toggleValue(query, "colour", colour)) });
  if (query.min !== undefined || query.max !== undefined) {
    const code = facets.price?.min.currencyCode ?? "";
    const text =
      query.min !== undefined && query.max !== undefined
        ? `${query.min} – ${query.max}`
        : query.min !== undefined
          ? `From ${query.min}`
          : `Up to ${query.max}`;
    chips.push({ label: `${code} ${text}`.trim(), href: link(withoutPrice(query)) });
  }
  if (query.sale) chips.push({ label: "On sale", href: link(toggleFlag(query, "sale")) });
  if (query.ready) chips.push({ label: "Ready to ship", href: link(toggleFlag(query, "ready")) });

  return (
    <ul className="mb-6 flex flex-wrap items-center gap-2" aria-label="Chosen filters">
      {chips.map((chip) => (
        <li key={chip.label}>
          <Link
            href={chip.href}
            scroll={false}
            aria-label={`Remove filter: ${chip.label}`}
            className="flex items-center gap-1.5 border border-line bg-cream px-3 py-1.5 text-xs hover:border-gold"
          >
            {chip.label}
            <LuX className="h-3 w-3" aria-hidden />
          </Link>
        </li>
      ))}
      <li>
        <Link
          href={link(clearFilters(query))}
          scroll={false}
          className="px-1 text-xs underline hover:text-gold"
        >
          Clear all
        </Link>
      </li>
    </ul>
  );
}
