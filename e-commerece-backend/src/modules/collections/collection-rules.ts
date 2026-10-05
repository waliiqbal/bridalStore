// The ONE place collection rules become a Prisma filter. Collection pages,
// facet counts, admin previews, sitemaps and feeds must all reuse it.
import type { Prisma } from '../../generated/prisma/client.js';
import {
  CollectionType,
  RuleField,
  RuleOperator,
} from '../../generated/prisma/enums.js';

export interface RuleInput {
  field: RuleField;
  operator: RuleOperator;
  value: string;
}

export interface CollectionForWhere {
  id: string;
  type: CollectionType;
  matchAllRules: boolean;
  rules: RuleInput[];
}

export interface RuleContext {
  // Category id → itself plus all sub-category ids
  categoryDescendants: (categoryId: string) => string[];
  now: Date;
}

const { EQUALS, NOT_EQUALS, LESS_THAN, GREATER_THAN } = RuleOperator;
const EQ_ONLY = [EQUALS, NOT_EQUALS];

export const ALLOWED_OPERATORS: Record<RuleField, RuleOperator[]> = {
  CATEGORY: EQ_ONLY,
  TAG: EQ_ONLY,
  ATTRIBUTE: EQ_ONLY,
  COLOUR: EQ_ONLY,
  SIZE: EQ_ONLY,
  PRICE: [EQUALS, NOT_EQUALS, LESS_THAN, GREATER_THAN],
  ON_SALE: EQ_ONLY,
  NEW_ARRIVAL: EQ_ONLY,
  READY_TO_SHIP: EQ_ONLY,
  // EQUALS = added within N days, NOT_EQUALS = added more than N days ago
  CREATED_WITHIN_DAYS: EQ_ONLY,
};

export const RULE_LABELS: Record<RuleField, string> = {
  CATEGORY: 'Category',
  TAG: 'Tag',
  ATTRIBUTE: 'Filter option',
  COLOUR: 'Colour',
  SIZE: 'Size',
  PRICE: 'Price',
  ON_SALE: 'On sale',
  NEW_ARRIVAL: 'New arrival',
  READY_TO_SHIP: 'Ready to ship',
  CREATED_WITHIN_DAYS: 'Added in the last days',
};

const BOOLEAN_FIELDS: RuleField[] = ['ON_SALE', 'NEW_ARRIVAL', 'READY_TO_SHIP'];
const MAX_PRICE_CENTS = 100_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Matches no product (used for empty smart collections and invalid rules).
const MATCH_NOTHING: Prisma.ProductWhereInput = { id: { in: [] } };

// Trims values, lowercases tags, and clears values on yes/no fields.
export function normalizeRule(rule: RuleInput): RuleInput {
  if (BOOLEAN_FIELDS.includes(rule.field)) return { ...rule, value: '' };
  const value = rule.value.trim();
  return { ...rule, value: rule.field === 'TAG' ? value.toLowerCase() : value };
}

// Shape check only; whether a category/attribute id exists is checked by the service.
export function validateRule(rule: RuleInput): string | null {
  const label = RULE_LABELS[rule.field];
  if (!label) return 'Unknown rule type';
  if (!ALLOWED_OPERATORS[rule.field].includes(rule.operator)) {
    return `"${label}" rules can only use: ${ALLOWED_OPERATORS[rule.field].join(', ')}`;
  }
  if (BOOLEAN_FIELDS.includes(rule.field)) return null;

  const value = rule.value.trim();
  if (rule.field === 'PRICE') {
    if (!/^\d+$/.test(value) || Number(value) > MAX_PRICE_CENTS) {
      return 'Price rules need a whole number of cents (e.g. 19900 for $199)';
    }
    return null;
  }
  if (rule.field === 'CREATED_WITHIN_DAYS') {
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 3650) {
      return '"Added in the last days" needs a number of days between 1 and 3650';
    }
    return null;
  }
  return value ? null : `"${label}" rules need a value`;
}

export function ruleToWhere(rule: RuleInput, ctx: RuleContext): Prisma.ProductWhereInput {
  if (validateRule(rule)) return MATCH_NOTHING;
  const { field, operator, value } = normalizeRule(rule);
  const is = operator === EQUALS;

  switch (field) {
    case 'CATEGORY': {
      const ids = ctx.categoryDescendants(value);
      return is
        ? { categoryId: { in: ids } }
        : { OR: [{ categoryId: null }, { categoryId: { notIn: ids } }] };
    }
    case 'TAG':
      return is ? { tags: { has: value } } : { NOT: { tags: { has: value } } };
    case 'ATTRIBUTE':
      return is
        ? { attributes: { some: { attributeValueId: value } } }
        : { attributes: { none: { attributeValueId: value } } };
    case 'COLOUR':
    case 'SIZE': {
      const column = field === 'COLOUR' ? 'colour' : 'size';
      const variant: Prisma.ProductVariantWhereInput = {
        isActive: true,
        [column]: { equals: value, mode: 'insensitive' },
      };
      return is ? { variants: { some: variant } } : { variants: { none: variant } };
    }
    case 'PRICE': {
      const cents = Number(value);
      if (operator === LESS_THAN) return { price: { lt: cents } };
      if (operator === GREATER_THAN) return { price: { gt: cents } };
      return is ? { price: cents } : { price: { not: cents } };
    }
    case 'ON_SALE':
      return is ? { compareAtPrice: { not: null } } : { compareAtPrice: null };
    case 'NEW_ARRIVAL':
      return { isNewArrival: is };
    case 'READY_TO_SHIP':
      return { isReadyToShip: is };
    case 'CREATED_WITHIN_DAYS': {
      const cutoff = new Date(ctx.now.getTime() - Number(value) * DAY_MS);
      return is ? { createdAt: { gte: cutoff } } : { createdAt: { lt: cutoff } };
    }
    default:
      return MATCH_NOTHING;
  }
}

/**
 * Products in a collection. Always limited to ACTIVE products.
 * MANUAL → hand-picked products; SMART → rules joined with AND (matchAllRules)
 * or OR. A smart collection with no rules matches nothing.
 */
export function buildCollectionWhere(
  collection: CollectionForWhere,
  ctx: RuleContext,
): Prisma.ProductWhereInput {
  const active: Prisma.ProductWhereInput = { status: 'ACTIVE' };

  if (collection.type === CollectionType.MANUAL) {
    return { AND: [active, { collections: { some: { collectionId: collection.id } } }] };
  }
  if (collection.rules.length === 0) return { AND: [active, MATCH_NOTHING] };

  const clauses = collection.rules.map((rule) => ruleToWhere(rule, ctx));
  return {
    AND: [active, collection.matchAllRules ? { AND: clauses } : { OR: clauses }],
  };
}
