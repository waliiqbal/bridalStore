import {
  entityPath,
  normalizePath,
  planRedirect,
  resolveManualTarget,
  type RedirectRow,
} from './redirect-plan.js';

// Applies a plan to an in-memory table, mirroring RedirectsService.
function apply(rows: RedirectRow[], from: string, to: string): RedirectRow[] {
  const plan = planRedirect(rows, from, to);
  let next = rows
    .filter((r) => !plan.delete.includes(r.fromPath))
    .map((r) => (plan.repoint.includes(r.fromPath) ? { ...r, toPath: to } : r));
  if (plan.upsert) {
    next = next.filter((r) => r.fromPath !== plan.upsert!.fromPath).concat(plan.upsert);
  }
  return next;
}

function assertNoChainsOrLoops(rows: RedirectRow[]) {
  const froms = new Set(rows.map((r) => r.fromPath));
  for (const r of rows) {
    expect(r.fromPath).not.toBe(r.toPath);
    expect(froms.has(r.toPath)).toBe(false);
  }
}

describe('planRedirect', () => {
  it('does nothing when the path did not change', () => {
    expect(planRedirect([], '/products/a', '/products/a')).toEqual({
      delete: [],
      repoint: [],
      upsert: null,
    });
  });

  it('creates a simple redirect', () => {
    expect(apply([], '/products/a', '/products/b')).toEqual([
      { fromPath: '/products/a', toPath: '/products/b' },
    ]);
  });

  it('flattens chains: A→B then B→C gives A→C and B→C', () => {
    let rows = apply([], '/products/a', '/products/b');
    rows = apply(rows, '/products/b', '/products/c');
    expect(rows).toEqual(
      expect.arrayContaining([
        { fromPath: '/products/a', toPath: '/products/c' },
        { fromPath: '/products/b', toPath: '/products/c' },
      ]),
    );
    expect(rows).toHaveLength(2);
    assertNoChainsOrLoops(rows);
  });

  it('renaming back never loops: A→B then B→A leaves only B→A', () => {
    let rows = apply([], '/products/a', '/products/b');
    rows = apply(rows, '/products/b', '/products/a');
    expect(rows).toEqual([{ fromPath: '/products/b', toPath: '/products/a' }]);
    assertNoChainsOrLoops(rows);
  });

  it('survives a long rename history without chains or loops', () => {
    const slugs = ['a', 'b', 'c', 'b', 'd', 'a', 'e'].map((s) => `/products/${s}`);
    let rows: RedirectRow[] = [];
    for (let i = 1; i < slugs.length; i++) rows = apply(rows, slugs[i - 1], slugs[i]);
    assertNoChainsOrLoops(rows);
    // Every old path ends at the current one in a single hop
    for (const old of ['a', 'b', 'c', 'd']) {
      expect(rows.find((r) => r.fromPath === `/products/${old}`)?.toPath).toBe('/products/e');
    }
  });

  it('removes a redirect away from a path that becomes live again', () => {
    const rows = [{ fromPath: '/pages/sale', toPath: '/collections/sale' }];
    const plan = planRedirect(rows, '/pages/old-sale', '/pages/sale');
    expect(plan.delete).toEqual(['/pages/sale']);
  });
});

describe('resolveManualTarget', () => {
  const rows = [{ fromPath: '/old', toPath: '/new' }];

  it('follows an existing redirect one hop', () => {
    expect(resolveManualTarget(rows, '/older', '/old')).toEqual({ target: '/new' });
  });

  it('rejects self-redirects and loops', () => {
    expect(resolveManualTarget(rows, '/x', '/x')).toHaveProperty('error');
    expect(resolveManualTarget(rows, '/new', '/old')).toEqual({
      error: 'This would create a loop: /old already redirects to /new',
    });
  });
});

describe('paths', () => {
  it('builds storefront paths for each entity', () => {
    expect(entityPath('product', 'x')).toBe('/products/x');
    expect(entityPath('collection', 'x')).toBe('/collections/x');
    expect(entityPath('category', 'x')).toBe('/categories/x');
    expect(entityPath('page', 'about')).toBe('/pages/about');
    expect(entityPath('page', 'home')).toBe('/');
  });

  it('normalizes paths', () => {
    expect(normalizePath(' /Products//Old-Slug/?utm=x#top ')).toBe('/products/old-slug');
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('https://evil.com/x')).toBeNull();
    expect(normalizePath('products/x')).toBeNull();
    expect(normalizePath('/has space')).toBeNull();
  });
});
