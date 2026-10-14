import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { paginate, toSkipTake } from '../../common/pagination/pagination.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AdminEnquiryListQueryDto, CreateEnquiryDto, UpdateEnquiryDto } from './dto/enquiry.dto.js';

const DAY_MS = 86_400_000;

@Injectable()
export class EnquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEnquiryDto, now = new Date()) {
    // Robots fill the hidden box. Pretend it worked, save nothing.
    if (dto.website) return { received: true };

    let eventDate: Date | null = null;
    if (dto.eventDate) {
      eventDate = new Date(`${dto.eventDate}T00:00:00.000Z`);
      // A little slack so a date that is "today" somewhere in the world is still accepted
      if (eventDate.getTime() < now.getTime() - 2 * DAY_MS) {
        throw new BadRequestException('Please choose a date that has not passed');
      }
    }

    await this.prisma.enquiry.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email ?? null,
        budget: dto.budget ?? null,
        eventDate,
        outfitTypes: [...new Set(dto.outfitTypes ?? [])],
        message: dto.message ?? null,
        source: dto.source?.toLowerCase() ?? 'website',
      },
    });
    return { received: true };
  }

  async listAdmin(query: AdminEnquiryListQueryDto) {
    const where: Prisma.EnquiryWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { phone: { contains: query.q } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const orderBy: Prisma.EnquiryOrderByWithRelationInput[] =
      query.sort === 'event'
        ? [{ eventDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }, { id: 'desc' }];

    const [items, total] = await Promise.all([
      this.prisma.enquiry.findMany({ where, orderBy, ...toSkipTake(query) }),
      this.prisma.enquiry.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  // How many enquiries are in each status (for the tabs)
  async counts() {
    const rows = await this.prisma.enquiry.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const counts: Record<string, number> = {
      NEW: 0,
      CONTACTED: 0,
      BOOKED: 0,
      CLOSED: 0,
    };
    for (const row of rows) counts[row.status] = row._count._all;
    return { ...counts, ALL: Object.values(counts).reduce((a, b) => a + b, 0) };
  }

  async update(id: string, dto: UpdateEnquiryDto) {
    const data: Prisma.EnquiryUpdateInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.adminNote !== undefined) data.adminNote = dto.adminNote?.trim() || null;
    try {
      return await this.prisma.enquiry.update({ where: { id }, data });
    } catch {
      throw new NotFoundException('Enquiry not found');
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.enquiry.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Enquiry not found');
    }
    return { success: true };
  }
}
