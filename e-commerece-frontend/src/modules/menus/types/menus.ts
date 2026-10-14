// These match the backend's admin menu responses exactly.

export type MenuItemType = "COLLECTION" | "CATEGORY" | "PAGE" | "URL" | "HEADING";

export interface MenuSummary {
  id: string;
  handle: string;
  name: string;
  _count: { items: number };
}

export interface AdminMenuItem {
  id: string;
  parentId: string | null;
  label: string;
  type: MenuItemType;
  url: string | null;
  imageUrl: string | null;
  highlight: string | null;
  sortOrder: number;
  collectionId: string | null;
  categoryId: string | null;
  pageId: string | null;
  collection: { slug: string; title: string; isPublished: boolean } | null;
  category: { slug: string; name: string; isVisible: boolean } | null;
  page: { slug: string; title: string; isPublished: boolean } | null;
  // Where the item leads on the website (null for group titles)
  href: string | null;
  // false when its target is a draft / hidden, so customers don't see it
  isVisibleInShop: boolean;
  targetName: string | null;
  children: AdminMenuItem[];
}

export interface AdminMenu {
  id: string;
  handle: string;
  name: string;
  items: AdminMenuItem[];
}

export interface MenuItemInput {
  label?: string;
  type?: MenuItemType;
  collectionId?: string | null;
  categoryId?: string | null;
  pageId?: string | null;
  url?: string | null;
  parentId?: string | null;
  imageUrl?: string | null;
  highlight?: string | null;
}
