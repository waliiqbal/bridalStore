import type { AdminCollection, CollectionInput, CollectionSort, CollectionType } from "../types/collections";
import { ruleProblem, toApiRule, type RuleDraft } from "./rule-fields";

export interface CollectionFormState {
  title: string;
  slug: string;
  type: CollectionType;
  matchAllRules: boolean;
  rules: RuleDraft[];
  defaultSort: CollectionSort;
  description: string;
  seoContent: string;
  bannerImageUrl: string | null;
  mobileBannerImageUrl: string | null;
  noticeText: string;
  filterAttributeIds: string[];
  isPublished: boolean;
  seoTitle: string;
  seoDescription: string;
}

export const SORT_LABELS: Record<CollectionSort, string> = {
  BEST_SELLING: "Best selling first",
  NEWEST: "Newest first",
  PRICE_ASC: "Price: low to high",
  PRICE_DESC: "Price: high to low",
  MANUAL: "Your own order (the order you arrange)",
};

// "Your own order" only makes sense for hand-picked collections
export function sortOptionsFor(type: CollectionType): CollectionSort[] {
  const common: CollectionSort[] = ["BEST_SELLING", "NEWEST", "PRICE_ASC", "PRICE_DESC"];
  return type === "MANUAL" ? ["MANUAL", ...common] : common;
}

export function toFormState(collection: AdminCollection | null): CollectionFormState {
  return {
    title: collection?.title ?? "",
    slug: collection?.slug ?? "",
    type: collection?.type ?? "MANUAL",
    matchAllRules: collection?.matchAllRules ?? true,
    rules: (collection?.rules ?? []).map(({ field, operator, value }) => ({
      key: crypto.randomUUID(),
      field,
      operator,
      value,
    })),
    defaultSort: collection?.defaultSort ?? "MANUAL",
    description: collection?.description ?? "",
    seoContent: collection?.seoContent ?? "",
    bannerImageUrl: collection?.bannerImageUrl ?? null,
    mobileBannerImageUrl: collection?.mobileBannerImageUrl ?? null,
    noticeText: collection?.noticeText ?? "",
    filterAttributeIds: collection?.filterAttributeIds ?? [],
    isPublished: collection?.isPublished ?? true,
    seoTitle: collection?.seoTitle ?? "",
    seoDescription: collection?.seoDescription ?? "",
  };
}

export type CollectionFormErrors = Partial<Record<"title" | "rules", string>>;

export function validateCollection(form: CollectionFormState): CollectionFormErrors {
  const errors: CollectionFormErrors = {};
  if (!form.title.trim()) errors.title = "Please give this collection a name.";
  if (form.type === "SMART") {
    if (form.rules.length === 0)
      errors.rules = "Add at least one rule, or switch to a hand-picked collection.";
    else {
      const bad = form.rules.findIndex((rule) => ruleProblem(rule) !== null);
      if (bad !== -1) errors.rules = `Rule ${bad + 1} isn't finished: ${ruleProblem(form.rules[bad])}`;
    }
  }
  return errors;
}

const orNull = (text: string) => (text.trim() ? text.trim() : null);

// `savedSlug` is the web address already stored (edit); it's only sent if changed.
export function toCollectionInput(form: CollectionFormState, savedSlug?: string): CollectionInput {
  const slug = form.slug.trim();
  const smart = form.type === "SMART";
  return {
    title: form.title.trim(),
    ...(slug && slug !== savedSlug && { slug }),
    type: form.type,
    matchAllRules: form.matchAllRules,
    // Hand-picked collections have no rules (the server rejects them)
    ...(smart && { rules: form.rules.map(toApiRule) }),
    defaultSort: smart && form.defaultSort === "MANUAL" ? "BEST_SELLING" : form.defaultSort,
    description: orNull(form.description),
    seoContent: orNull(form.seoContent),
    bannerImageUrl: form.bannerImageUrl,
    mobileBannerImageUrl: form.mobileBannerImageUrl,
    noticeText: orNull(form.noticeText),
    filterAttributeIds: form.filterAttributeIds,
    isPublished: form.isPublished,
    seoTitle: orNull(form.seoTitle),
    seoDescription: orNull(form.seoDescription),
  };
}
