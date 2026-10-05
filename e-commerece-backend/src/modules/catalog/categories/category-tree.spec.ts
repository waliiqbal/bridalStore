import { buildTree, CategoryIndex } from './category-tree.js';

const rows = [
  { id: 'bridal', parentId: null },
  { id: 'lehenga', parentId: 'bridal' },
  { id: 'lehenga-heavy', parentId: 'lehenga' },
  { id: 'sharara', parentId: 'bridal' },
  { id: 'menswear', parentId: null },
];

describe('CategoryIndex', () => {
  const index = new CategoryIndex(rows);

  it('returns a category and all nested sub-categories', () => {
    expect(index.descendantIds('bridal').sort()).toEqual(
      ['bridal', 'lehenga', 'lehenga-heavy', 'sharara'].sort(),
    );
    expect(index.descendantIds('menswear')).toEqual(['menswear']);
  });

  it('builds the ancestry root-first', () => {
    expect(index.ancestry('lehenga-heavy').map((r) => r.id)).toEqual([
      'bridal',
      'lehenga',
      'lehenga-heavy',
    ]);
  });

  it('lists rows depth-first so parents precede their children', () => {
    const shuffled = new CategoryIndex([rows[3], rows[2], rows[4], rows[1], rows[0]]);
    expect(shuffled.treeOrder().map((r) => r.id)).toEqual([
      'menswear',
      'bridal',
      'sharara',
      'lehenga',
      'lehenga-heavy',
    ]);
  });

  it('detects cycles', () => {
    expect(index.wouldCreateCycle('bridal', 'lehenga-heavy')).toBe(true);
    expect(index.wouldCreateCycle('bridal', 'bridal')).toBe(true);
    expect(index.wouldCreateCycle('lehenga', 'menswear')).toBe(false);
  });
});

describe('buildTree', () => {
  it('nests children and drops orphans of missing parents', () => {
    const visible = rows.filter((r) => r.id !== 'lehenga');
    const tree = buildTree(visible);
    expect(tree.map((n) => n.id)).toEqual(['bridal', 'menswear']);
    expect(tree[0].children.map((n) => n.id)).toEqual(['sharara']);
  });
});
