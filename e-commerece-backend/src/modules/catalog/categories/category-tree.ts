export interface TreeRow {
  id: string;
  parentId: string | null;
}

export type TreeNode<T> = T & { children: TreeNode<T>[] };

// Rows must already be in display order. Rows whose parent is missing
// (e.g. hidden) are dropped together with their subtree.
export function buildTree<T extends TreeRow>(rows: T[]): TreeNode<T>[] {
  const nodes = new Map<string, TreeNode<T>>();
  for (const row of rows) nodes.set(row.id, { ...row, children: [] });

  const roots: TreeNode<T>[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    if (row.parentId === null) roots.push(node);
    else nodes.get(row.parentId)?.children.push(node);
  }
  return roots;
}

export class CategoryIndex<T extends TreeRow = TreeRow> {
  private readonly byId = new Map<string, T>();
  private readonly childrenOf = new Map<string, string[]>();

  constructor(readonly rows: T[]) {
    for (const row of rows) {
      this.byId.set(row.id, row);
      if (row.parentId) {
        const list = this.childrenOf.get(row.parentId) ?? [];
        list.push(row.id);
        this.childrenOf.set(row.parentId, list);
      }
    }
  }

  get(id: string): T | undefined {
    return this.byId.get(id);
  }

  // The category itself plus every sub-category below it.
  descendantIds(id: string): string[] {
    const result: string[] = [];
    const stack = [id];
    const seen = new Set<string>();
    while (stack.length) {
      const current = stack.pop()!;
      if (seen.has(current)) continue;
      seen.add(current);
      result.push(current);
      stack.push(...(this.childrenOf.get(current) ?? []));
    }
    return result;
  }

  // Root first, ending with the category itself.
  ancestry(id: string): T[] {
    const chain: T[] = [];
    const seen = new Set<string>();
    let current = this.byId.get(id);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      chain.unshift(current);
      current = current.parentId ? this.byId.get(current.parentId) : undefined;
    }
    return chain;
  }

  // All rows in tree order: each parent followed by its sub-categories.
  treeOrder(): T[] {
    const ordered: T[] = [];
    const visit = (id: string) => {
      const row = this.byId.get(id);
      if (!row) return;
      ordered.push(row);
      for (const childId of this.childrenOf.get(id) ?? []) visit(childId);
    };
    for (const row of this.rows) if (row.parentId === null) visit(row.id);
    return ordered;
  }

  // True if moving `id` under `newParentId` would create a cycle.
  wouldCreateCycle(id: string, newParentId: string): boolean {
    return this.ancestry(newParentId).some((row) => row.id === id);
  }
}
