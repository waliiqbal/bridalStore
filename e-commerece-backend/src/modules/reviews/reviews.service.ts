import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { paginate, toSkipTake } from '../../common/pagination/pagination.js';
import { definedOnly } from '../../common/validation.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CustomerProfile } from '../auth/customer/customer-session.js';
import { CacheTags, RevalidationService } from '../revalidation/revalidation.service.js';
import type {
  AdminReviewListQueryDto,
  CreateReviewDto,
  ReviewListQueryDto,
  UpdateReviewDto,
} from './dto/review.dto.js';
import { ratingSummary, reviewerName } from './review-rules.js';

// What shoppers see: no customer ID, no email, no private status
const PUBLIC_SELECT = {
  id: true,
  rating: true,
  title: true,
  body: true,
  authorName: true,
  isVerified: true,
  shopReply: true,
  createdAt: true,
} satisfies Prisma.ReviewSelect;

const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  status: true,
  updatedAt: true,
  customer: { select: { email: true } },
  product: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ReviewSelect;

// Orders that were paid (everything except waiting for payment, cancelled and refunded)
const PAID_STATUSES = ['PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  // ── Shoppers ──

  async listForProduct(slug: string, query: ReviewListQueryDto) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: 'ACTIVE' },
      select: { id: true, ratingCount: true, ratingTotal: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    const where: Prisma.ReviewWhereInput = { productId: product.id, status: 'APPROVED' };
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        select: PUBLIC_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...toSkipTake(query),
      }),
      this.prisma.review.count({ where }),
    ]);
    return {
      ...paginate(items, total, query),
      summary: ratingSummary(product.ratingCount, product.ratingTotal),
    };
  }

  async create(slug: string, customer: CustomerProfile, dto: CreateReviewDto) {
    const [product, settings] = await Promise.all([
      this.prisma.product.findFirst({ where: { slug, status: 'ACTIVE' }, select: { id: true } }),
      this.prisma.storeSettings.findUnique({ where: { id: 1 }, select: { autoApproveReviews: true } }),
    ]);
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.review.findUnique({
      where: { productId_customerId: { productId: product.id, customerId: customer.id } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('You have already reviewed this product. Thank you!');

    const bought = await this.prisma.orderItem.count({
      where: {
        variant: { productId: product.id },
        order: { customerId: customer.id, status: { in: [...PAID_STATUSES] } },
      },
    });
    const approved = settings?.autoApproveReviews ?? false;
    const review = await this.prisma.review.create({
      data: {
        productId: product.id,
        customerId: customer.id,
        rating: dto.rating,
        title: dto.title ?? null,
        body: dto.body,
        authorName: reviewerName(customer.firstName, customer.lastName),
        isVerified: bought > 0,
        status: approved ? 'APPROVED' : 'PENDING',
      },
      select: PUBLIC_SELECT,
    });
    if (approved) await this.syncRating(product.id);
    return { review, awaitingApproval: !approved };
  }

  // ── Owner ──

  async listAdmin(query: AdminReviewListQueryDto) {
    const where: Prisma.ReviewWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.q && { product: { name: { contains: query.q.trim(), mode: 'insensitive' } } }),
    };
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        select: ADMIN_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...toSkipTake(query),
      }),
      this.prisma.review.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async counts() {
    const rows = await this.prisma.review.groupBy({ by: ['status'], _count: { _all: true } });
    const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const row of rows) counts[row.status] = row._count._all;
    return counts;
  }

  async update(id: string, dto: UpdateReviewDto) {
    const current = await this.prisma.review.findUnique({ where: { id }, select: { productId: true } });
    if (!current) throw new NotFoundException('Review not found');
    const review = await this.prisma.review.update({
      where: { id },
      data: definedOnly({ status: dto.status, shopReply: dto.shopReply }),
      select: ADMIN_SELECT,
    });
    await this.syncRating(current.productId);
    return review;
  }

  async remove(id: string) {
    const current = await this.prisma.review.findUnique({ where: { id }, select: { productId: true } });
    if (!current) throw new NotFoundException('Review not found');
    await this.prisma.review.delete({ where: { id } });
    await this.syncRating(current.productId);
    return { deleted: true };
  }

  // Recounts the approved reviews (so it is always right, however many times it runs),
  // then refreshes the product page.
  private async syncRating(productId: string): Promise<void> {
    const sum = await this.prisma.review.aggregate({
      where: { productId, status: 'APPROVED' },
      _count: { _all: true },
      _sum: { rating: true },
    });
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { ratingCount: sum._count._all, ratingTotal: sum._sum.rating ?? 0 },
      select: { slug: true },
    });
    void this.revalidation.notify([CacheTags.product(product.slug)]);
  }
}
