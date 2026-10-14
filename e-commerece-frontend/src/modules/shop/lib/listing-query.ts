import type { SortKey } from "../types/shop";

// The shopper's filter choices live in the page address (?sort=…&attr=fabric.silk&min=100),
// so a filtered page can be shared, bookmarked, and rendered on the server.

export const PAGE_SIZE = 24;

export interface ListingQuery {
  sort?: SortKey;
  page: number;
  category: string[];
  // "attributeSlug.valueSlug"
  attr: string[];
  size: string[];
  colour: string[];
  // Whole currency units (e.g. 200 = $200), as shown to the shopper
  min?: number;
  max?: number;
  sale: boolean;
  ready: boolean;
}

export type RawParams = Record<string, string | string[] | undefined>;

const SORTS: SortKey[] = ["MANUAL", "BEST_SELLING", "NEWEST", "PRICE_ASC", "PRICE_DESC"];
const ATTR = /^[a-z0-9-]+\.[a-z0-9-]+$/;

const list = (value: string | string[] | undefined, max = 30): string[] =>
  (Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max);

const units = (value: string | string[] | undefined): number | undefined => {
  const text = Array.isArray(value) ? value[0] : value;
  if (!text || !/^\d{1,7}$/.test(text)) return undefined;
  return Number(text);
};

export function parseListingQuery(raw: RawParams): ListingQuery {
  const sort = Array.isArray(raw.sort) ? raw.sort[0] : raw.sort;
  const page = Number(Array.isArray(raw.page) ? raw.page[0] : raw.page);
  return {
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : undefined,
    page: Number.isInteger(page) && page >= 1 && page <= 500 ? page : 1,
    category: list(raw.category).filter((slug) => /^[a-z0-9-]+$/.test(slug)),
    attr: list(raw.attr).filter((pair) => ATTR.test(pair)),
    size: list(raw.size).filter((v) => v.length <= 30),
    colour: list(raw.colour).filter((v) => v.length <= 60),
    min: units(raw.min),
    max: units(raw.max),
    sale: raw.sale === "1",
    ready: raw.ready === "1",
  };
}

// What the backend expects. Prices go over as cents in the shopper's currency.
export function toApiParams(query: ListingQuery, currency: string): string {
  const params = new URLSearchParams();
  params.set("currency", currency);
  params.set("pageSize", String(PAGE_SIZE));
  if (query.sort) params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.category.length) params.set("category", query.category.join(","));
  if (query.attr.length) params.set("attr", query.attr.join(","));
  if (query.size.length) params.set("sizes", query.size.join(","));
  if (query.colour.length) params.set("colours", query.colour.join(","));
  if (query.min !== undefined) params.set("minPrice", String(query.min * 100));
  if (query.max !== undefined) params.set("maxPrice", String(query.max * 100));
  if (query.sale) params.set("onSale", "true");
  if (query.ready) params.set("readyToShip", "true");
  return `?${params.toString()}`;
}

// A link to the same page with this set of choices
export function buildHref(basePath: string, query: ListingQuery): string {
  const params = new URLSearchParams();
  if (query.sort) params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.category.length) params.set("category", query.category.join(","));
  if (query.attr.length) params.set("attr", query.attr.join(","));
  if (query.size.length) params.set("size", query.size.join(","));
  if (query.colour.length) params.set("colour", query.colour.join(","));
  if (query.min !== undefined) params.set("min", String(query.min));
  if (query.max !== undefined) params.set("max", String(query.max));
  if (query.sale) params.set("sale", "1");
  if (query.ready) params.set("ready", "1");
  const text = params.toString();
  return text ? `${basePath}?${text}` : basePath;
}

export type ListFilter = "category" | "attr" | "size" | "colour";

// Add the value if it isn't chosen, remove it if it is. Changing a filter goes back to page 1.
export function toggleValue(query: ListingQuery, filter: ListFilter, value: string): ListingQuery {
  const current = query[filter];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  return { ...query, [filter]: next, page: 1 };
}

export const toggleFlag = (query: ListingQuery, flag: "sale" | "ready"): ListingQuery => ({
  ...query,
  [flag]: !query[flag],
  page: 1,
});

export const withSort = (query: ListingQuery, sort: SortKey): ListingQuery => ({ ...query, sort, page: 1 });
export const withPage = (query: ListingQuery, page: number): ListingQuery => ({ ...query, page });
export const withoutPrice = (query: ListingQuery): ListingQuery => ({
  ...query,
  min: undefined,
  max: undefined,
  page: 1,
});

// Any filter chosen (sorting and paging don't count)
export const hasFilters = (q: ListingQuery): boolean =>
  q.category.length + q.attr.length + q.size.length + q.colour.length > 0 ||
  q.min !== undefined ||
  q.max !== undefined ||
  q.sale ||
  q.ready;

export const clearFilters = (q: ListingQuery): ListingQuery => ({
  ...q,
  category: [],
  attr: [],
  size: [],
  colour: [],
  min: undefined,
  max: undefined,
  sale: false,
  ready: false,
  page: 1,
});
