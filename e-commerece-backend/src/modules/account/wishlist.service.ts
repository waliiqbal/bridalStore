import { Injectable, NotFoundException } from '@nestjs/common';
import { paginate, toSkipTake, type PaginationQueryDto } from '../../common/pagination/pagination.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PRODUCT_CARD_SELECT, toProductCard } from '../catalog/products/product-card.js';
import { CurrencyService } from '../pricing/currency.service.js';

// Hidden (draft/archived) products stay saved but are not shown.
const VISIBLE = { product: { status: 'ACTIVE' as const } };

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencies: CurrencyService,
  ) {}

  // Same card shape as collection listings. Fixed queries: items (+ batched card relations), count, currency.
  async list(customerId: string, pagination: PaginationQueryDto, currencyCode?: string) {
    const where = { customerId, ...VISIBLE };
    const [rows, total, currency] = await Promise.all([
      this.prisma.wishlistItem.findMany({
        where,
        select: { createdAt: true, product: { select: PRODUCT_CARD_SELECT } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...toSkipTake(pagination),
      }),
      this.prisma.wishlistItem.count({ where }),
      this.currencies.resolve(currencyCode),
    ]);
    return paginate(
      rows.map((row) => ({ ...toProductCard(row.product, currency), addedAt: row.createdAt })),
      total,
      pagination,
    );
  }

  // Lets the storefront fill in the heart icons with one call.
  async ids(customerId: string) {
    const rows = await this.prisma.wishlistItem.findMany({
      where: { customerId, ...VISIBLE },
      select: { productId: true },
    });
    return { productIds: rows.map((r) => r.productId) };
  }

  // Safe to call twice.
  async add(customerId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('This product is no longer available');
    await this.prisma.wishlistItem.upsert({
      where: { customerId_productId: { customerId, productId } },
      create: { customerId, productId },
      update: {},
    });
    return { productId, saved: true };
  }

  async remove(customerId: string, productId: string) {
    await this.prisma.wishlistItem.deleteMany({ where: { customerId, productId } });
    return { productId, saved: false };
  }
}
