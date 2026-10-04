import type { RuleField, RuleOperator } from '../../generated/prisma/enums.js';
import {
  ALLOWED_OPERATORS,
  buildCollectionWhere,
  ruleToWhere,
  validateRule,
  type CollectionForWhere,
  type RuleContext,
} from './collection-rules.js';

const NOW = new Date('2026-10-04T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const NOTHING = { id: { in: [] } };

const tree: Record<string, string[]> = {
  bridal: ['bridal', 'lehenga', 'lehenga-heavy', 'sharara'],
  lehenga: ['lehenga', 'lehenga-heavy'],
};
const ctx: RuleContext = {
  categoryDescendants: (id) => tree[id] ?? [id],
  now: NOW,
};

const rule = (field: RuleField, operator: RuleOperator, value = '') => ({ field, operator, value });

describe('ruleToWhere — every field and operator', () => {
  const cases: [RuleField, RuleOperator, string, unknown][] = [
    ['CATEGORY', 'EQUALS', 'bridal', { categoryId: { in: tree.bridal } }],
    [
      'CATEGORY',
      'NOT_EQUALS',
      'lehenga',
      { OR: [{ categoryId: null }, { categoryId: { notIn: tree.lehenga } }] },
    ],
    ['TAG', 'EQUALS', ' Bridal ', { tags: { has: 'bridal' } }],
    ['TAG', 'NOT_EQUALS', 'Sale', { NOT: { tags: { has: 'sale' } } }],
    ['ATTRIBUTE', 'EQUALS', 'val_1', { attributes: { some: { attributeValueId: 'val_1' } } }],
    ['ATTRIBUTE', 'NOT_EQUALS', 'val_1', { attributes: { none: { attributeValueId: 'val_1' } } }],
    [
      'COLOUR',
      'EQUALS',
      'Red',
      { variants: { some: { isActive: true, colour: { equals: 'Red', mode: 'insensitive' } } } },
    ],
    [
      'COLOUR',
      'NOT_EQUALS',
      'Red',
      { variants: { none: { isActive: true, colour: { equals: 'Red', mode: 'insensitive' } } } },
    ],
    [
      'SIZE',
      'EQUALS',
      'XL',
      { variants: { some: { isActive: true, size: { equals: 'XL', mode: 'insensitive' } } } },
    ],
    [
      'SIZE',
      'NOT_EQUALS',
      'XL',
      { variants: { none: { isActive: true, size: { equals: 'XL', mode: 'insensitive' } } } },
    ],
    ['PRICE', 'EQUALS', '19900', { price: 19900 }],
    ['PRICE', 'NOT_EQUALS', '19900', { price: { not: 19900 } }],
    ['PRICE', 'LESS_THAN', '19900', { price: { lt: 19900 } }],
    ['PRICE', 'GREATER_THAN', '19900', { price: { gt: 19900 } }],
    ['ON_SALE', 'EQUALS', '', { compareAtPrice: { not: null } }],
    ['ON_SALE', 'NOT_EQUALS', '', { compareAtPrice: null }],
    ['NEW_ARRIVAL', 'EQUALS', '', { isNewArrival: true }],
    ['NEW_ARRIVAL', 'NOT_EQUALS', '', { isNewArrival: false }],
    ['READY_TO_SHIP', 'EQUALS', 'ignored', { isReadyToShip: true }],
    ['READY_TO_SHIP', 'NOT_EQUALS', '', { isReadyToShip: false }],
    [
      'CREATED_WITHIN_DAYS',
      'EQUALS',
      '30',
      { createdAt: { gte: new Date(NOW.getTime() - 30 * DAY) } },
    ],
    [
      'CREATED_WITHIN_DAYS',
      'NOT_EQUALS',
      '30',
      { createdAt: { lt: new Date(NOW.getTime() - 30 * DAY) } },
    ],
  ];

  it.each(cases)('%s %s %j', (field, operator, value, expected) => {
    expect(ruleToWhere(rule(field, operator, value), ctx)).toEqual(expected);
  });

  it('covers every allowed field/operator pair', () => {
    const covered = new Set(cases.map(([f, o]) => `${f}:${o}`));
    for (const [field, operators] of Object.entries(ALLOWED_OPERATORS)) {
      for (const op of operators) expect(covered).toContain(`${field}:${op}`);
    }
  });

  it('treats an unknown category id as just itself', () => {
    expect(ruleToWhere(rule('CATEGORY', 'EQUALS', 'other'), ctx)).toEqual({
      categoryId: { in: ['other'] },
    });
  });

  it('matches nothing for an invalid rule instead of matching everything', () => {
    expect(ruleToWhere(rule('PRICE', 'EQUALS', 'abc'), ctx)).toEqual(NOTHING);
    expect(ruleToWhere(rule('TAG', 'LESS_THAN', 'x'), ctx)).toEqual(NOTHING);
    expect(ruleToWhere(rule('COLOUR', 'EQUALS', '  '), ctx)).toEqual(NOTHING);
  });
});

describe('validateRule', () => {
  it('accepts valid rules', () => {
    expect(validateRule(rule('PRICE', 'LESS_THAN', '19900'))).toBeNull();
    expect(validateRule(rule('CREATED_WITHIN_DAYS', 'EQUALS', '14'))).toBeNull();
    expect(validateRule(rule('ON_SALE', 'EQUALS'))).toBeNull();
    expect(validateRule(rule('TAG', 'EQUALS', 'eid'))).toBeNull();
  });

  it('rejects operators that make no sense for the field', () => {
    expect(validateRule(rule('CATEGORY', 'GREATER_THAN', 'x'))).toMatch(/can only use/);
    expect(validateRule(rule('CREATED_WITHIN_DAYS', 'LESS_THAN', '5'))).toMatch(/can only use/);
  });

  it('requires numbers for PRICE and CREATED_WITHIN_DAYS', () => {
    expect(validateRule(rule('PRICE', 'EQUALS', '199.00'))).toMatch(/whole number of cents/);
    expect(validateRule(rule('PRICE', 'EQUALS', '-5'))).toMatch(/whole number of cents/);
    expect(validateRule(rule('CREATED_WITHIN_DAYS', 'EQUALS', '0'))).toMatch(/between 1 and 3650/);
    expect(validateRule(rule('CREATED_WITHIN_DAYS', 'EQUALS', 'week'))).toMatch(/between 1/);
  });

  it('requires a value for text and id fields', () => {
    expect(validateRule(rule('CATEGORY', 'EQUALS', ''))).toMatch(/need a value/);
    expect(validateRule(rule('SIZE', 'EQUALS', ' '))).toMatch(/need a value/);
  });
});

describe('buildCollectionWhere', () => {
  const smart = (rules: ReturnType<typeof rule>[], matchAllRules = true): CollectionForWhere => ({
    id: 'col_1',
    type: 'SMART',
    matchAllRules,
    rules,
  });
  const onSale = rule('ON_SALE', 'EQUALS');
  const cheap = rule('PRICE', 'LESS_THAN', '20000');

  it('joins rules with AND when matchAllRules is true', () => {
    expect(buildCollectionWhere(smart([onSale, cheap], true), ctx)).toEqual({
      AND: [
        { status: 'ACTIVE' },
        { AND: [{ compareAtPrice: { not: null } }, { price: { lt: 20000 } }] },
      ],
    });
  });

  it('joins rules with OR when matchAllRules is false, still requiring ACTIVE', () => {
    expect(buildCollectionWhere(smart([onSale, cheap], false), ctx)).toEqual({
      AND: [
        { status: 'ACTIVE' },
        { OR: [{ compareAtPrice: { not: null } }, { price: { lt: 20000 } }] },
      ],
    });
  });

  it('includes nested sub-categories for CATEGORY rules', () => {
    const where = buildCollectionWhere(smart([rule('CATEGORY', 'EQUALS', 'bridal')]), ctx);
    expect(where).toEqual({
      AND: [
        { status: 'ACTIVE' },
        { AND: [{ categoryId: { in: ['bridal', 'lehenga', 'lehenga-heavy', 'sharara'] } }] },
      ],
    });
  });

  it('matches nothing for a smart collection with no rules', () => {
    expect(buildCollectionWhere(smart([]), ctx)).toEqual({
      AND: [{ status: 'ACTIVE' }, NOTHING],
    });
  });

  it('uses hand-picked products for manual collections and ignores rules', () => {
    const where = buildCollectionWhere(
      { id: 'col_2', type: 'MANUAL', matchAllRules: true, rules: [onSale] },
      ctx,
    );
    expect(where).toEqual({
      AND: [{ status: 'ACTIVE' }, { collections: { some: { collectionId: 'col_2' } } }],
    });
  });
});
