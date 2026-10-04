import { Injectable, NotFoundException } from '@nestjs/common';
import { money } from '../../common/money/money.js';
import { paginate, toSkipTake } from '../../common/pagination/pagination.js';
import type { OrderStatus, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AdminCustomerListQueryDto } from './dto/customers.dto.js';

// Orders that count as money received (refunded/cancelled/unpaid excluded).
export const PAID_ORDER_STATUSES: OrderStatus[] = ['PROCESSING', 'SHIPPED', 'DELIVERED'];

const LIST_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  isActive: true,
  marketingOptIn: true,
  passwordHash: true,
  createdAt: true,
  _count: { select: { orders: true } },
} satisfies Prisma.CustomerSelect;

@Injectable()
export class CustomersAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // Fixed queries: customers page, count, one grouped total for the page.
  async list(query: AdminCustomerListQueryDto) {
    const where = searchWhere(query.q);
    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        select: LIST_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...toSkipTake(query),
      }),
      this.prisma.customer.count({ where }),
    ]);
    const spent = rows.length
      ? await this.prisma.order.groupBy({
          by: ['customerId'],
          where: { customerId: { in: rows.map((r) => r.id) }, status: { in: PAID_ORDER_STATUSES } },
          _sum: { totalAud: true },
        })
      : [];
    const spentBy = new Map(spent.map((s) => [s.customerId, s._sum.totalAud ?? 0]));

    return paginate(
      rows.map(({ passwordHash, _count, ...customer }) => ({
        ...customer,
        // Guest-checkout customers have no password until they create an account
        hasAccount: passwordHash !== null,
        orderCount: _count.orders,
        totalSpent: money(spentBy.get(customer.id) ?? 0, 'AUD'),
      })),
      total,
      query,
    );
  }

  async get(id: string) {
    const [customer, spent] = await Promise.all([
      this.prisma.customer.findUnique({
        where: { id },
        select: {
          ...LIST_SELECT,
          updatedAt: true,
          addresses: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              line1: true,
              line2: true,
              city: true,
              state: true,
              postcode: true,
              countryCode: true,
              isDefault: true,
            },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
          },
          orders: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
              currencyCode: true,
              totalAud: true,
              createdAt: true,
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            take: 5,
          },
        },
      }),
      this.prisma.order.aggregate({
        where: { customerId: id, status: { in: PAID_ORDER_STATUSES } },
        _sum: { totalAud: true },
      }),
    ]);
    if (!customer) throw new NotFoundException('Customer not found');

    const { passwordHash, _count, orders, ...rest } = customer;
    return {
      ...rest,
      hasAccount: passwordHash !== null,
      orderCount: _count.orders,
      totalSpent: money(spent._sum.totalAud ?? 0, 'AUD'),
      recentOrders: orders.map(({ total, currencyCode, totalAud, ...order }) => ({
        ...order,
        total: money(total, currencyCode),
        totalAud: money(totalAud, 'AUD'),
      })),
    };
  }

  // Deactivated customers are signed out immediately (CustomerGuard checks isActive).
  async setActive(id: string, isActive: boolean) {
    const { count } = await this.prisma.customer.updateMany({ where: { id }, data: { isActive } });
    if (!count) throw new NotFoundException('Customer not found');
    return this.get(id);
  }
}

// Every word must match the email, first name or last name ("aisha khan").
function searchWhere(q?: string): Prisma.CustomerWhereInput {
  const terms = q?.trim().split(/\s+/).filter(Boolean).slice(0, 5) ?? [];
  if (!terms.length) return {};
  return {
    AND: terms.map((term) => ({
      OR: [
        { email: { contains: term, mode: 'insensitive' } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
      ],
    })),
  };
}
