import type { PaginationQueryDto } from '../../common/pagination/pagination.js';
import { paginate, toSkipTake } from '../../common/pagination/pagination.js';
import type { CollectionSort, Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { PRODUCT_CARD_SELECT, toProductCard } from '../catalog/products/product-card.js';
import type { CurrencyContext } from '../pricing/currency.service.js';
import type { CollectionForWhere, RuleContext } from './collection-rules.js';
import type { CategoryIndex } from '../catalog/categories/category-tree.js';

// Every sort ends with id so pagination is stable when values tie.
export const SORT_ORDER: Record<
  Exclude<CollectionSort, 'MANUAL'>,
  Prisma.ProductOrderByWithRelationInput[]
> = {
  BEST_SELLING: [{ salesCount: 'desc' }, { id: 'asc' }],
  NEWEST: [{ createdAt: 'desc' }, { id: 'asc' }],
  PRICE_ASC: [{ price: 'asc' }, { id: 'asc' }],
  PRICE_DESC: [{ price: 'desc' }, { id: 'asc' }],
};

// MANUAL order only exists for hand-picked collections.
export function resolveSort(
  requested: CollectionSort,
  type: CollectionForWhere['type'],
): CollectionSort {
  return requested === 'MANUAL' && type !== 'MANUAL' ? 'BEST_SELLING' : requested;
}

export function availableSorts(type: CollectionForWhere['type']): CollectionSort[] {
  const sorts: CollectionSort[] = ['BEST_SELLING', 'NEWEST', 'PRICE_ASC', 'PRICE_DESC'];
  return type === 'MANUAL' ? ['MANUAL', ...sorts] : sorts;
}

export function ruleContext(index: CategoryIndex): RuleContext {
  return { categoryDescendants: (id) => index.descendantIds(id), now: new Date() };
}

export async function listCollectionProducts(
  prisma: PrismaService,
  args: {
    collectionId: string;
    where: Prisma.ProductWhereInput;
    sort: CollectionSort;
    pagination: PaginationQueryDto;
    currency: CurrencyContext;
  },
) {
  const { collectionId, where, sort, pagination, currency } = args;

  if (sort === 'MANUAL') {
    const [links, total] = await Promise.all([
      prisma.collectionProduct.findMany({
        where: { collectionId, product: where },
        select: { product: { select: PRODUCT_CARD_SELECT } },
        orderBy: [{ sortOrder: 'asc' }, { productId: 'asc' }],
        ...toSkipTake(pagination),
      }),
      prisma.product.count({ where }),
    ]);
    return paginate(
      links.map((l) => toProductCard(l.product, currency)),
      total,
      pagination,
    );
  }

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: PRODUCT_CARD_SELECT,
      orderBy: SORT_ORDER[sort],
      ...toSkipTake(pagination),
    }),
    prisma.product.count({ where }),
  ]);
  return paginate(
    rows.map((row) => toProductCard(row, currency)),
    total,
    pagination,
  );
}
