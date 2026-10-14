import { flattenCategories } from "@/modules/catalog/lib/category-options";
import type { CategoryNode } from "@/modules/catalog/types/catalog";
import type { CollectionListItem } from "@/modules/collections/types/collections";
import type { PageListItem } from "../types/pages";

export interface LinkGroup {
  label: string;
  options: { label: string; value: string }[];
}

// Everything in the shop the owner can point a button at, so nobody has to type addresses.
export function buildLinkOptions(args: {
  collections: CollectionListItem[];
  categories: CategoryNode[];
  pages: PageListItem[];
}): LinkGroup[] {
  const slugOf = new Map<string, string>();
  const walk = (nodes: CategoryNode[]) =>
    nodes.forEach((node) => {
      slugOf.set(node.id, node.slug);
      walk(node.children);
    });
  walk(args.categories);

  return [
    { label: "Home", options: [{ label: "Home page", value: "/" }] },
    {
      label: "Collections",
      options: args.collections.map((c) => ({ label: c.title, value: `/collections/${c.slug}` })),
    },
    {
      label: "Categories",
      options: flattenCategories(args.categories).map((c) => ({
        label: c.label,
        value: `/categories/${slugOf.get(c.id) ?? ""}`,
      })),
    },
    {
      label: "Pages",
      options: args.pages
        .filter((p) => p.slug !== "home")
        .map((p) => ({ label: p.title, value: `/pages/${p.slug}` })),
    },
  ].filter((group) => group.options.length > 0);
}
