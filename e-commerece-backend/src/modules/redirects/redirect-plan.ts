// Invariant kept by planRedirect: no redirect points at a path that itself
// redirects (no chains), and no path redirects to itself (no loops).

export type RedirectEntity = 'product' | 'collection' | 'category' | 'page';

export function entityPath(entity: RedirectEntity, slug: string): string {
  switch (entity) {
    case 'product':
      return `/products/${slug}`;
    case 'collection':
      return `/collections/${slug}`;
    case 'category':
      return `/categories/${slug}`;
    case 'page':
      return slug === 'home' ? '/' : `/pages/${slug}`;
  }
}

// "/Products/Old-Slug/?utm=x#top" → "/products/old-slug". Returns null if not a site path.
export function normalizePath(input: string): string | null {
  const path = input.trim().split(/[?#]/)[0].replace(/\/{2,}/g, '/');
  if (!path.startsWith('/') || /\s/.test(path) || path.length > 500) return null;
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return trimmed.toLowerCase() || '/';
}

export interface RedirectRow {
  fromPath: string;
  toPath: string;
}

export interface RedirectPlan {
  // Redirects to delete (by fromPath)
  delete: string[];
  // Existing redirects whose toPath becomes `to` (by fromPath)
  repoint: string[];
  // The new redirect; null when there is nothing to do
  upsert: RedirectRow | null;
}

/**
 * Plan "from now redirects to `to`". `existing` must include every redirect
 * whose toPath is `from` or whose fromPath is `from` or `to`.
 *
 * - Redirects that pointed at `from` now point straight at `to` (no chains).
 * - A redirect away from `to` is deleted: that path is live again. Renaming
 *   back (A→B then B→A) therefore never creates a loop.
 */
export function planRedirect(existing: RedirectRow[], from: string, to: string): RedirectPlan {
  if (from === to) return { delete: [], repoint: [], upsert: null };

  const remove = new Set<string>();
  const repoint: string[] = [];

  for (const row of existing) {
    if (row.fromPath === to) remove.add(row.fromPath);
    else if (row.toPath === from && row.fromPath !== from) repoint.push(row.fromPath);
  }

  return {
    delete: [...remove],
    repoint: repoint.filter((p) => !remove.has(p)),
    upsert: { fromPath: from, toPath: to },
  };
}

/**
 * For manual redirects: follow `to` one hop (chains never exist, so one hop
 * is enough) and reject anything that would end where it started.
 */
export function resolveManualTarget(
  existing: RedirectRow[],
  from: string,
  to: string,
): { target: string } | { error: string } {
  if (from === to) return { error: 'A page cannot redirect to itself' };
  const next = existing.find((r) => r.fromPath === to);
  const target = next ? next.toPath : to;
  if (target === from) {
    return { error: `This would create a loop: ${to} already redirects to ${from}` };
  }
  return { target };
}
