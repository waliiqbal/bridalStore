import type { AdminMenuItem, MenuItemInput, MenuItemType } from "../types/menus";

export const MENU_TYPES: { type: MenuItemType; label: string; hint: string }[] = [
  { type: "CATEGORY", label: "A category", hint: "Opens a category page, like Bridal › Lehenga." },
  { type: "COLLECTION", label: "A collection", hint: "Opens a collection page, like Eid Edit." },
  { type: "PAGE", label: "A page", hint: "Opens a page like About us or Shipping." },
  { type: "URL", label: "A web address", hint: "Opens any link, on your site or another." },
  {
    type: "HEADING",
    label: "A group title (no link)",
    hint: "A title that organises the links under it in the big menu, like “Style” or “Occasion”.",
  },
];

export const typeLabel = (type: MenuItemType) => MENU_TYPES.find((t) => t.type === type)?.label ?? type;

// Small coloured labels in the menu, e.g. a red “Sale”
export const HIGHLIGHTS: { value: string; label: string }[] = [
  { value: "", label: "Normal" },
  { value: "red", label: "Red (stands out, good for Sale)" },
  { value: "gold", label: "Gold" },
  { value: "dark", label: "Black label" },
];

export interface MenuItemFormState {
  label: string;
  type: MenuItemType;
  collectionId: string;
  categoryId: string;
  pageId: string;
  url: string;
  parentId: string;
  imageUrl: string | null;
  highlight: string;
}

export function newMenuItemForm(parentId: string): MenuItemFormState {
  return {
    label: "",
    type: "CATEGORY",
    collectionId: "",
    categoryId: "",
    pageId: "",
    url: "",
    parentId,
    imageUrl: null,
    highlight: "",
  };
}

export function toMenuItemForm(item: AdminMenuItem): MenuItemFormState {
  return {
    label: item.label,
    type: item.type,
    collectionId: item.collectionId ?? "",
    categoryId: item.categoryId ?? "",
    pageId: item.pageId ?? "",
    url: item.url ?? "",
    parentId: item.parentId ?? "",
    imageUrl: item.imageUrl,
    highlight: item.highlight ?? "",
  };
}

const SAFE_LINK = /^(\/(?!\/)\S*|https?:\/\/\S+|mailto:\S+|tel:[+0-9 ()-]+)$/i;

export type MenuItemErrors = Partial<Record<"label" | "target", string>>;

export function validateMenuItem(form: MenuItemFormState): MenuItemErrors {
  const errors: MenuItemErrors = {};
  if (!form.label.trim()) errors.label = "Please enter the words customers will read.";
  if (form.type === "CATEGORY" && !form.categoryId) errors.target = "Choose a category.";
  if (form.type === "COLLECTION" && !form.collectionId) errors.target = "Choose a collection.";
  if (form.type === "PAGE" && !form.pageId) errors.target = "Choose a page.";
  if (form.type === "URL") {
    if (!form.url.trim()) errors.target = "Enter the address this opens.";
    else if (!SAFE_LINK.test(form.url.trim())) {
      errors.target = "Use an address like /pages/about, or one starting with https://";
    }
  }
  return errors;
}

// Always sends all four targets, so changing the type clears the old one
// (a group title must have none).
export function toMenuItemInput(form: MenuItemFormState): MenuItemInput {
  return {
    label: form.label.trim(),
    type: form.type,
    collectionId: form.type === "COLLECTION" ? form.collectionId : null,
    categoryId: form.type === "CATEGORY" ? form.categoryId : null,
    pageId: form.type === "PAGE" ? form.pageId : null,
    url: form.type === "URL" ? form.url.trim() : null,
    imageUrl: form.imageUrl,
    highlight: form.highlight || null,
  };
}

// Items in a flat list for a "sits inside" dropdown. The item being edited, and everything
// inside it, is left out (an item can't be placed inside itself).
export function flattenMenu(
  items: AdminMenuItem[],
  exclude: ReadonlySet<string> = new Set(),
  trail: string[] = [],
): { id: string; label: string }[] {
  return items.flatMap((item) => {
    if (exclude.has(item.id)) return [];
    const path = [...trail, item.label];
    return [{ id: item.id, label: path.join(" › ") }, ...flattenMenu(item.children, exclude, path)];
  });
}

export function collectMenuIds(item: AdminMenuItem): string[] {
  return [item.id, ...item.children.flatMap(collectMenuIds)];
}

export function findMenuItem(items: AdminMenuItem[], id: string): AdminMenuItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    const found = findMenuItem(item.children, id);
    if (found) return found;
  }
  return null;
}

// Why an item isn't showing, in plain words
export function hiddenReason(item: AdminMenuItem): string | null {
  if (item.isVisibleInShop) return null;
  if (item.type === "COLLECTION") return "Not shown: this collection is a draft.";
  if (item.type === "CATEGORY") return "Not shown: this category is hidden.";
  if (item.type === "PAGE") return "Not shown: this page is a draft.";
  return "Not shown: it has no link.";
}
