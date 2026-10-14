import type { CategoryNode } from "../types/catalog";

export interface CategoryOption {
  id: string;
  // "Bridal › Lehenga": the full path, so the owner can tell similar names apart
  label: string;
}

// Flattens the category tree into a list for dropdowns. Anything in `exclude`
// (and everything below it) is left out.
export function flattenCategories(
  tree: CategoryNode[],
  exclude: ReadonlySet<string> = new Set(),
  trail: string[] = [],
): CategoryOption[] {
  const options: CategoryOption[] = [];
  for (const node of tree) {
    if (exclude.has(node.id)) continue;
    const path = [...trail, node.name];
    options.push({ id: node.id, label: path.join(" › ") });
    options.push(...flattenCategories(node.children, exclude, path));
  }
  return options;
}

// A category's id plus the ids of everything below it
export function collectIds(node: CategoryNode): string[] {
  return [node.id, ...node.children.flatMap(collectIds)];
}

export function findCategory(tree: CategoryNode[], id: string): CategoryNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findCategory(node.children, id);
    if (found) return found;
  }
  return null;
}
