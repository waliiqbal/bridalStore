import type { Prisma } from '../../../generated/prisma/client.js';

// A banner shows when it is active and now is within [startsAt, endsAt).
// A missing date means "no limit" on that side.
export function liveBannerWhere(now: Date): Prisma.BannerWhereInput {
  return {
    isActive: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
    ],
  };
}

export function isBannerLive(
  banner: { isActive: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date,
): boolean {
  return (
    banner.isActive &&
    (banner.startsAt === null || banner.startsAt <= now) &&
    (banner.endsAt === null || banner.endsAt > now)
  );
}

export function validateBannerWindow(startsAt: Date | null, endsAt: Date | null): string | null {
  if (startsAt && endsAt && startsAt >= endsAt) {
    return 'The end date must be after the start date';
  }
  return null;
}
