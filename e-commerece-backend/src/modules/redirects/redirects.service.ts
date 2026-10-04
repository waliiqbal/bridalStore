import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { paginate, toSkipTake } from '../../common/pagination/pagination.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CacheTags, RevalidationService } from '../revalidation/revalidation.service.js';
import type { RedirectListQueryDto } from './dto/redirect.dto.js';
import {
  entityPath,
  normalizePath,
  planRedirect,
  resolveManualTarget,
  type RedirectEntity,
} from './redirect-plan.js';

type Db = PrismaService | Prisma.TransactionClient;

const SELECT = {
  id: true,
  fromPath: true,
  toPath: true,
  statusCode: true,
  createdAt: true,
} as const;

@Injectable()
export class RedirectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  /**
   * Call inside the same transaction as the slug update, so the old URL
   * always keeps working.
   */
  async recordSlugChange(
    tx: Prisma.TransactionClient,
    entity: RedirectEntity,
    oldSlug: string,
    newSlug: string,
  ): Promise<void> {
    if (oldSlug === newSlug) return;
    await this.applyRedirect(tx, entityPath(entity, oldSlug), entityPath(entity, newSlug));
  }

  async resolve(rawPath: string) {
    const path = normalizePath(rawPath);
    if (!path) throw new BadRequestException('path must start with "/"');
    const redirect = await this.prisma.redirect.findUnique({
      where: { fromPath: path },
      select: { toPath: true, statusCode: true },
    });
    if (!redirect) throw new NotFoundException('No redirect for this path');
    return redirect;
  }

  async list(query: RedirectListQueryDto) {
    const where: Prisma.RedirectWhereInput = query.q
      ? {
          OR: [
            { fromPath: { contains: query.q, mode: 'insensitive' } },
            { toPath: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.redirect.findMany({
        where,
        select: SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...toSkipTake(query),
      }),
      this.prisma.redirect.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async create(fromPath: string, toPath: string) {
    const [from, to] = this.normalizePair(fromPath, toPath);
    const redirect = await this.prisma.$transaction(async (tx) => {
      const existing = await this.relevantRows(tx, from, to);
      const resolved = resolveManualTarget(existing, from, to);
      if ('error' in resolved) throw new BadRequestException(resolved.error);
      await this.applyRedirect(tx, from, resolved.target);
      return tx.redirect.findUniqueOrThrow({ where: { fromPath: from }, select: SELECT });
    });
    void this.revalidation.notify([CacheTags.redirects]);
    return redirect;
  }

  async update(id: string, toPath: string) {
    const current = await this.prisma.redirect.findUnique({ where: { id }, select: { fromPath: true } });
    if (!current) throw new NotFoundException('Redirect not found');
    return this.create(current.fromPath, toPath);
  }

  async remove(id: string) {
    const { count } = await this.prisma.redirect.deleteMany({ where: { id } });
    if (!count) throw new NotFoundException('Redirect not found');
    void this.revalidation.notify([CacheTags.redirects]);
    return { deleted: true };
  }

  private async applyRedirect(db: Db, from: string, to: string) {
    const plan = planRedirect(await this.relevantRows(db, from, to), from, to);
    if (plan.delete.length) {
      await db.redirect.deleteMany({ where: { fromPath: { in: plan.delete } } });
    }
    if (plan.repoint.length) {
      await db.redirect.updateMany({ where: { fromPath: { in: plan.repoint } }, data: { toPath: to } });
    }
    if (plan.upsert) {
      await db.redirect.upsert({
        where: { fromPath: plan.upsert.fromPath },
        update: { toPath: plan.upsert.toPath },
        create: plan.upsert,
      });
    }
  }

  private relevantRows(db: Db, from: string, to: string) {
    return db.redirect.findMany({
      where: { OR: [{ toPath: from }, { fromPath: { in: [from, to] } }] },
      select: { fromPath: true, toPath: true },
    });
  }

  private normalizePair(fromPath: string, toPath: string): [string, string] {
    const from = normalizePath(fromPath);
    const to = normalizePath(toPath);
    if (!from || !to) {
      throw new BadRequestException('Both paths must start with "/", e.g. /products/old-name');
    }
    if (from === '/') throw new BadRequestException('The home page cannot be redirected');
    return [from, to];
  }
}
