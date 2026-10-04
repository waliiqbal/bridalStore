import { Injectable, NotFoundException } from '@nestjs/common';
import { paginate, toSkipTake, type PaginationQueryDto } from '../../common/pagination/pagination.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PaymentConfigService } from '../payments/payment-config.service.js';
import type { AdminOrderListQueryDto } from './dto/orders.dto.js';
import { normalizeOrderNumber } from './order-rules.js';
import {
  adminOrderView,
  customerOrderView,
  ORDER_DETAIL_SELECT,
  ORDER_SUMMARY_SELECT,
  orderSummary,
} from './order-view.js';

const NEWEST: Prisma.OrderOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'desc' }];
const LOOKUP_NOT_FOUND = "We couldn't find an order with those details. Please check the order number and email.";

// Read side of orders: customer history, guest lookup and the admin list/detail.
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentConfigService,
  ) {}

  async listForCustomer(customerId: string, pagination: PaginationQueryDto) {
    const where = { customerId };
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({ where, select: ORDER_SUMMARY_SELECT, orderBy: NEWEST, ...toSkipTake(pagination) }),
      this.prisma.order.count({ where }),
    ]);
    return paginate(
      rows.map((row) => {
        const { email: _e, totalAud: _t, ...summary } = orderSummary(row);
        return summary;
      }),
      total,
      pagination,
    );
  }

  async getForCustomer(customerId: string, orderNumber: string) {
    const number = normalizeOrderNumber(orderNumber);
    const row = number
      ? await this.prisma.order.findFirst({ where: { orderNumber: number, customerId }, select: ORDER_DETAIL_SELECT })
      : null;
    if (!row) throw new NotFoundException('Order not found');
    return customerOrderView(row, this.payments.available());
  }

  // One query either way, so "wrong email" and "no such order" look identical.
  async lookup(orderNumber: string, email: string) {
    const number = normalizeOrderNumber(orderNumber);
    const row = await this.prisma.order.findFirst({
      where: { orderNumber: number ?? '', email: email.trim().toLowerCase() },
      select: ORDER_DETAIL_SELECT,
    });
    if (!row) throw new NotFoundException(LOOKUP_NOT_FOUND);
    return customerOrderView(row, this.payments.available());
  }

  async adminList(query: AdminOrderListQueryDto) {
    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.needsAttention) where.attentionNote = { not: null };
    if (query.from || query.to) where.createdAt = { gte: query.from, lt: query.to };
    if (query.q) {
      const q = query.q;
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { shipFullName: { contains: q, mode: 'insensitive' } },
        { customer: { firstName: { contains: q, mode: 'insensitive' } } },
        { customer: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({ where, select: ORDER_SUMMARY_SELECT, orderBy: NEWEST, ...toSkipTake(query) }),
      this.prisma.order.count({ where }),
    ]);
    return paginate(rows.map(orderSummary), total, query);
  }

  async adminGet(id: string) {
    const row = await this.prisma.order.findUnique({ where: { id }, select: ORDER_DETAIL_SELECT });
    if (!row) throw new NotFoundException('Order not found');
    return adminOrderView(row, this.payments.available());
  }

  async updateAdminNote(id: string, adminNote: string | null | undefined, resolveAttention?: boolean) {
    const { count } = await this.prisma.order.updateMany({
      where: { id },
      data: {
        ...(adminNote !== undefined && { adminNote: adminNote?.trim() || null }),
        // The owner has dealt with the flagged problem
        ...(resolveAttention && { attentionNote: null }),
      },
    });
    if (!count) throw new NotFoundException('Order not found');
    return this.adminGet(id);
  }
}
