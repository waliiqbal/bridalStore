import { Injectable } from '@nestjs/common';
import { money } from '../../common/money/money.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PAID_ORDER_STATUSES } from '../customers/customers.admin.service.js';
import { STATUS_LABELS } from '../orders/order-rules.js';
import { periodBounds } from './period-bounds.js';

// A piece is "running low" at this many or fewer
export const LOW_STOCK_LIMIT = 2;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // The owner's home screen. A fixed number of queries, whatever the size of the shop.
  async summary(now = new Date()) {
    const bounds = periodBounds(now);
    // Sales = orders that have been paid (and not refunded or cancelled), counted from when they were paid
    const sales = (since: Date) =>
      this.prisma.order.aggregate({
        where: { status: { in: PAID_ORDER_STATUSES }, placedAt: { gte: since } },
        _count: { _all: true },
        _sum: { totalAud: true },
      });
    const lowStockWhere: Prisma.ProductVariantWhereInput = {
      isActive: true,
      stock: { lte: LOW_STOCK_LIMIT },
      product: { status: 'ACTIVE' },
    };

    const [
      today,
      week,
      month,
      toSend,
      needsAttention,
      reviewsWaiting,
      newEnquiries,
      recent,
      lowStock,
      lowStockTotal,
      top,
    ] = await Promise.all([
      sales(bounds.today),
      sales(bounds.weekStart),
      sales(bounds.monthStart),
      this.prisma.order.count({ where: { status: 'PROCESSING' } }),
      this.prisma.order.count({ where: { attentionNote: { not: null } } }),
      this.prisma.review.count({ where: { status: 'PENDING' } }),
      this.prisma.enquiry.count({ where: { status: 'NEW' } }),
      this.prisma.order.findMany({
        where: { status: { not: 'PENDING_PAYMENT' } },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          shipFullName: true,
          total: true,
          currencyCode: true,
          placedAt: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: 8,
      }),
      this.prisma.productVariant.findMany({
        where: lowStockWhere,
        select: {
          id: true,
          sku: true,
          size: true,
          colour: true,
          stock: true,
          product: { select: { id: true, name: true, slug: true } },
        },
        orderBy: [{ stock: 'asc' }, { sku: 'asc' }],
        take: 8,
      }),
      this.prisma.productVariant.count({ where: lowStockWhere }),
      this.prisma.product.findMany({
        where: { status: 'ACTIVE', salesCount: { gt: 0 } },
        select: { id: true, name: true, slug: true, salesCount: true },
        orderBy: [{ salesCount: 'desc' }, { id: 'asc' }],
        take: 5,
      }),
    ]);

    const period = (p: typeof today) => ({
      orders: p._count._all,
      sales: money(p._sum.totalAud ?? 0, 'AUD'),
    });
    return {
      today: period(today),
      week: period(week),
      month: period(month),
      // The owner's to-do list
      toDo: { toSend, needsAttention, reviewsWaiting, newEnquiries },
      recentOrders: recent.map(({ total, currencyCode, placedAt, createdAt, ...order }) => ({
        ...order,
        statusLabel: STATUS_LABELS[order.status],
        total: money(total, currencyCode),
        at: placedAt ?? createdAt,
      })),
      lowStock: { limit: LOW_STOCK_LIMIT, total: lowStockTotal, items: lowStock },
      topProducts: top,
    };
  }
}
