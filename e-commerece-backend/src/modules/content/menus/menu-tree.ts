import { SAFE_LINK } from '../../../common/validation.js';
import type { MenuItemType } from '../../../generated/prisma/enums.js';
import { buildTree, type TreeNode } from '../../catalog/categories/category-tree.js';

export interface MenuItemRow {
  id: string;
  parentId: string | null;
  label: string;
  type: MenuItemType;
  url: string | null;
  imageUrl: string | null;
  highlight: string | null;
  collection: { slug: string; isPublished: boolean } | null;
  category: { slug: string; isVisible: boolean } | null;
  page: { slug: string; isPublished: boolean } | null;
}

export interface PublicMenuItem {
  id: string;
  label: string;
  type: MenuItemType;
  href: string | null;
  imageUrl: string | null;
  highlight: string | null;
  children: PublicMenuItem[];
}

export interface MenuTargetInput {
  type: MenuItemType;
  collectionId?: string | null;
  categoryId?: string | null;
  pageId?: string | null;
  url?: string | null;
}

// Storefront link for an item; null for HEADING (a group title, not a link).
export function menuHref(item: MenuItemRow): string | null {
  switch (item.type) {
    case 'COLLECTION':
      return item.collection ? `/collections/${item.collection.slug}` : null;
    case 'CATEGORY':
      return item.category ? `/categories/${item.category.slug}` : null;
    case 'PAGE':
      if (!item.page) return null;
      return item.page.slug === 'home' ? '/' : `/pages/${item.page.slug}`;
    case 'URL':
      return item.url;
    case 'HEADING':
      return null;
  }
}

// Items whose target is missing, unpublished or hidden are left out.
export function isMenuItemVisible(item: MenuItemRow): boolean {
  switch (item.type) {
    case 'COLLECTION':
      return !!item.collection?.isPublished;
    case 'CATEGORY':
      return !!item.category?.isVisible;
    case 'PAGE':
      return !!item.page?.isPublished;
    case 'URL':
      return !!item.url;
    case 'HEADING':
      return true;
  }
}

/**
 * Nested public menu. Hidden items are removed with everything under them,
 * and headings that end up with no children are dropped.
 */
export function buildPublicMenu(rows: MenuItemRow[]): PublicMenuItem[] {
  const tree = buildTree(rows.filter(isMenuItemVisible));

  const toPublic = (nodes: TreeNode<MenuItemRow>[]): PublicMenuItem[] =>
    nodes.flatMap((node) => {
      const children = toPublic(node.children);
      if (node.type === 'HEADING' && children.length === 0) return [];
      return [
        {
          id: node.id,
          label: node.label,
          type: node.type,
          href: menuHref(node),
          imageUrl: node.imageUrl,
          highlight: node.highlight,
          children,
        },
      ];
    });

  return toPublic(tree);
}

// Each type needs exactly its own target. Returns an error message or null.
export function validateMenuTarget(input: MenuTargetInput): string | null {
  const targets = {
    COLLECTION: input.collectionId,
    CATEGORY: input.categoryId,
    PAGE: input.pageId,
    URL: input.url,
  } as const;

  switch (input.type) {
    case 'COLLECTION':
      return input.collectionId ? null : 'Choose the collection this menu item opens';
    case 'CATEGORY':
      return input.categoryId ? null : 'Choose the category this menu item opens';
    case 'PAGE':
      return input.pageId ? null : 'Choose the page this menu item opens';
    case 'URL':
      if (!input.url) return 'Enter the link this menu item opens';
      return SAFE_LINK.test(input.url)
        ? null
        : 'Links must be a site path like /pages/about, or a full http(s), mailto: or tel: link';
    case 'HEADING':
      return Object.values(targets).some(Boolean)
        ? 'Headings are group titles and cannot link anywhere'
        : null;
  }
}

// Keeps only the target that matches the type; the rest are cleared.
export function normalizeMenuTarget(input: MenuTargetInput) {
  return {
    collectionId: input.type === 'COLLECTION' ? (input.collectionId ?? null) : null,
    categoryId: input.type === 'CATEGORY' ? (input.categoryId ?? null) : null,
    pageId: input.type === 'PAGE' ? (input.pageId ?? null) : null,
    url: input.type === 'URL' ? (input.url ?? null) : null,
  };
}
