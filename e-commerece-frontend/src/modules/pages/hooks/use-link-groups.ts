"use client";

import { useMemo } from "react";
import { getCategoryTree } from "@/modules/catalog/api/catalog.api";
import type { CategoryNode } from "@/modules/catalog/types/catalog";
import { listCollections } from "@/modules/collections/api/collections.api";
import type { CollectionListItem } from "@/modules/collections/types/collections";
import { useAdminQuery } from "@/shared/admin/hooks";
import { listPages } from "../api/pages.api";
import { buildLinkOptions, type LinkGroup } from "../lib/link-options";
import type { PageListItem } from "../types/pages";

interface LinkGroupsResult {
  // Everything in the shop a link can point at, grouped for a dropdown
  groups: LinkGroup[];
  collections: CollectionListItem[] | undefined;
  categories: CategoryNode[] | undefined;
  pages: PageListItem[] | undefined;
  error: string | null;
  reload: () => void;
}

// Loads the collections, categories and pages once for screens that offer "choose from your shop".
export function useLinkGroups(): LinkGroupsResult {
  const query = useAdminQuery(() => Promise.all([listCollections(), getCategoryTree(), listPages()]), []);
  const [collections, categories, pages] = query.data ?? [];
  const groups = useMemo(
    () => (collections && categories && pages ? buildLinkOptions({ collections, categories, pages }) : []),
    [collections, categories, pages],
  );
  return { groups, collections, categories, pages, error: query.error, reload: query.reload };
}
