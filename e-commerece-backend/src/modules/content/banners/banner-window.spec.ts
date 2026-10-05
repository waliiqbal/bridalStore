import { isBannerLive, liveBannerWhere, validateBannerWindow } from './banner-window.js';

const now = new Date('2026-10-04T12:00:00Z');
const hour = 60 * 60 * 1000;
const at = (offsetHours: number) => new Date(now.getTime() + offsetHours * hour);
const banner = (startsAt: Date | null, endsAt: Date | null, isActive = true) => ({
  isActive,
  startsAt,
  endsAt,
});

describe('banner date window', () => {
  it.each([
    ['no dates', null, null, true],
    ['started, no end', at(-1), null, true],
    ['starts exactly now', now, null, true],
    ['not started yet', at(1), null, false],
    ['ends later', null, at(1), true],
    ['ended exactly now (end is exclusive)', null, now, false],
    ['already ended', at(-2), at(-1), false],
    ['inside the window', at(-1), at(1), true],
  ])('%s', (_label, startsAt, endsAt, expected) => {
    expect(isBannerLive(banner(startsAt, endsAt), now)).toBe(expected);
  });

  it('never shows inactive banners', () => {
    expect(isBannerLive(banner(null, null, false), now)).toBe(false);
  });

  it('builds the same window as a Prisma filter', () => {
    expect(liveBannerWhere(now)).toEqual({
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    });
  });

  it('requires the end to be after the start', () => {
    expect(validateBannerWindow(at(1), at(-1))).toMatch(/after the start/);
    expect(validateBannerWindow(now, now)).toMatch(/after the start/);
    expect(validateBannerWindow(at(-1), at(1))).toBeNull();
    expect(validateBannerWindow(null, at(1))).toBeNull();
  });
});
