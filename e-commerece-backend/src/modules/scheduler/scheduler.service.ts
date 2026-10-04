import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Env } from '../../config/env.validation.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CartService } from '../cart/cart.service.js';
import { OrderLifecycleService } from '../orders/order-lifecycle.service.js';

// Postgres advisory lock ids, one per job
const LOCKS = { releaseReservations: 5_001, deleteExpiredCarts: 5_002 } as const;

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger('Scheduler');
  private readonly enabled: boolean;
  private readonly running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrderLifecycleService,
    private readonly carts: CartService,
    config: ConfigService<Env, true>,
  ) {
    this.enabled = config.get('SCHEDULER_ENABLED', { infer: true });
  }

  // Unpaid orders past their 30-minute hold: cancel and return stock + coupon uses.
  @Cron(CronExpression.EVERY_5_MINUTES)
  releaseExpiredReservations() {
    return this.run('releaseReservations', async () => {
      const result = await this.orders.releaseExpiredReservations();
      return result.cancelled
        ? `cancelled ${result.cancelled} unpaid order(s): ${result.orderNumbers.join(', ')}`
        : 'no expired reservations';
    });
  }

  // Carts inactive for 30 days.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  deleteExpiredCarts() {
    return this.run('deleteExpiredCarts', async () => `deleted ${await this.carts.deleteExpired()} expired cart(s)`);
  }

  /**
   * Runs a job at most once at a time: an in-process flag, plus a Postgres
   * advisory lock held for the job's duration so several API servers never
   * run the same job together. Returns null when skipped.
   */
  async run(job: keyof typeof LOCKS, work: () => Promise<string>): Promise<string | null> {
    if (!this.enabled || this.running.has(job)) return null;
    this.running.add(job);
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`
            SELECT pg_try_advisory_xact_lock(${LOCKS[job]}) AS locked`;
          if (!locked) {
            this.logger.log(`${job}: skipped, already running on another server`);
            return null;
          }
          const started = Date.now();
          const summary = await work();
          this.logger.log(`${job}: ${summary} (${Date.now() - started} ms)`);
          return summary;
        },
        // The lock lives as long as this transaction; give long jobs room
        { timeout: 10 * 60_000, maxWait: 10_000 },
      );
    } catch (error) {
      this.logger.error(`${job} failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    } finally {
      this.running.delete(job);
    }
  }
}
