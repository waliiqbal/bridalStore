import Link from "next/link";
import type { ReactNode } from "react";
import { LuCheck, LuChevronDown } from "react-icons/lu";
import {
  buildHref,
  clearFilters,
  hasFilters,
  toggleFlag,
  toggleValue,
  type ListingQuery,
} from "../lib/listing-query";
import type { Facets } from "../types/shop";

// Every choice is a plain link, so filtering works on the server (and without JavaScript).

function Option({
  href,
  label,
  count,
  selected,
  indent = false,
}: {
  href: string;
  label: string;
  count: number;
  selected: boolean;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`flex items-center gap-2.5 py-1.5 text-sm hover:text-gold ${indent ? "pl-5" : ""}`}
    >
      <span
        aria-hidden
        className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
          selected ? "border-black bg-black text-white" : "border-neutral-400"
        }`}
      >
        {selected && <LuCheck className="h-3 w-3" />}
      </span>
      <span className="flex-1">{label}</span>
      <span className="text-xs text-muted">({count})</span>
      {selected && <span className="sr-only">selected</span>}
    </Link>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group border-b border-line py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium uppercase tracking-wide">
        {title}
        <LuChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

// On a category page, only the categories inside it are offered
function categoriesToShow(rows: Facets["categories"], root?: string) {
  if (!root) return rows;
  const inside = new Set([root]);
  for (let grew = true; grew;) {
    grew = false;
    for (const row of rows) {
      if (row.parentSlug && inside.has(row.parentSlug) && !inside.has(row.slug)) {
        inside.add(row.slug);
        grew = true;
      }
    }
  }
  inside.delete(root);
  return rows.filter((row) => inside.has(row.slug));
}

export function FilterPanel({
  basePath,
  query,
  facets,
  categoryRoot,
}: {
  basePath: string;
  query: ListingQuery;
  facets: Facets;
  categoryRoot?: string;
}) {
  const link = (next: ListingQuery) => buildHref(basePath, next);
  const categories = categoriesToShow(facets.categories, categoryRoot);
  const depthOf = (row: Facets["categories"][number]) =>
    row.parentSlug && row.parentSlug !== categoryRoot ? 1 : 0;
  const price = facets.price;
  const priceCurrency = price?.min.currencyCode ?? "";

  return (
    <div>
      {hasFilters(query) && (
        <Link
          href={link(clearFilters(query))}
          scroll={false}
          className="mb-2 inline-block text-sm underline hover:text-gold"
        >
          Clear all filters
        </Link>
      )}

      {(facets.onSale.count > 0 ||
        facets.onSale.selected ||
        facets.readyToShip.count > 0 ||
        facets.readyToShip.selected) && (
        <Group title="Quick picks">
          {(facets.onSale.count > 0 || facets.onSale.selected) && (
            <Option
              href={link(toggleFlag(query, "sale"))}
              label="On sale"
              count={facets.onSale.count}
              selected={facets.onSale.selected}
            />
          )}
          {(facets.readyToShip.count > 0 || facets.readyToShip.selected) && (
            <Option
              href={link(toggleFlag(query, "ready"))}
              label="Ready to ship"
              count={facets.readyToShip.count}
              selected={facets.readyToShip.selected}
            />
          )}
        </Group>
      )}

      {categories.length > 0 && (
        <Group title="Category">
          {categories.map((row) => (
            <Option
              key={row.slug}
              href={link(toggleValue(query, "category", row.slug))}
              label={row.name}
              count={row.count}
              selected={row.selected}
              indent={depthOf(row) > 0}
            />
          ))}
        </Group>
      )}

      {facets.attributes.map((attribute) => (
        <Group key={attribute.slug} title={attribute.name}>
          {attribute.values.map((value) => (
            <Option
              key={value.slug}
              href={link(toggleValue(query, "attr", `${attribute.slug}.${value.slug}`))}
              label={value.value}
              count={value.count}
              selected={value.selected}
            />
          ))}
        </Group>
      ))}

      {facets.sizes.length > 0 && (
        <Group title="Size">
          {facets.sizes.map((size) => (
            <Option
              key={size.value}
              href={link(toggleValue(query, "size", size.value))}
              label={size.value}
              count={size.count}
              selected={size.selected}
            />
          ))}
        </Group>
      )}

      {facets.colours.length > 0 && (
        <Group title="Colour">
          {facets.colours.map((colour) => (
            <Option
              key={colour.value}
              href={link(toggleValue(query, "colour", colour.value))}
              label={colour.value}
              count={colour.count}
              selected={colour.selected}
            />
          ))}
        </Group>
      )}

      {price && (
        <Group title={`Price (${priceCurrency})`}>
          <form action={basePath} method="get" className="space-y-3">
            {query.sort && <input type="hidden" name="sort" value={query.sort} />}
            {query.category.length > 0 && (
              <input type="hidden" name="category" value={query.category.join(",")} />
            )}
            {query.attr.length > 0 && <input type="hidden" name="attr" value={query.attr.join(",")} />}
            {query.size.length > 0 && <input type="hidden" name="size" value={query.size.join(",")} />}
            {query.colour.length > 0 && <input type="hidden" name="colour" value={query.colour.join(",")} />}
            {query.sale && <input type="hidden" name="sale" value="1" />}
            {query.ready && <input type="hidden" name="ready" value="1" />}
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="min"
                min={0}
                inputMode="numeric"
                defaultValue={query.min}
                placeholder={String(Math.floor(price.min.amount / 100))}
                aria-label="Lowest price"
                className="h-10 w-full min-w-0 border border-line px-2 text-sm outline-none focus:border-gold"
              />
              <span aria-hidden>–</span>
              <input
                type="number"
                name="max"
                min={0}
                inputMode="numeric"
                defaultValue={query.max}
                placeholder={String(Math.ceil(price.max.amount / 100))}
                aria-label="Highest price"
                className="h-10 w-full min-w-0 border border-line px-2 text-sm outline-none focus:border-gold"
              />
            </div>
            <button
              type="submit"
              className="h-10 w-full bg-black text-sm font-medium uppercase tracking-wider text-white hover:bg-gold"
            >
              Apply
            </button>
          </form>
        </Group>
      )}
    </div>
  );
}
