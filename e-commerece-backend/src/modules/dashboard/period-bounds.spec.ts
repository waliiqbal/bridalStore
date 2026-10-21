import { describe, expect, it } from 'vitest';
import { periodBounds } from './period-bounds.js';

const iso = (d: Date) => d.toISOString();

describe('periodBounds (Australia/Sydney)', () => {
  it('starts today at local midnight, not server midnight', () => {
    // 14 Oct 2026 23:30 UTC is already 15 Oct 10:30 in Sydney (daylight saving, +11)
    const b = periodBounds(new Date('2026-10-14T23:30:00Z'));
    expect(iso(b.today)).toBe('2026-10-14T13:00:00.000Z'); // 15 Oct 00:00 +11
  });

  it('starts the week on Monday and the month on the 1st', () => {
    // Saturday 17 Oct 2026 in Sydney
    const b = periodBounds(new Date('2026-10-17T03:00:00Z'));
    expect(iso(b.weekStart)).toBe('2026-10-11T13:00:00.000Z'); // Mon 12 Oct 00:00 +11
    expect(iso(b.monthStart)).toBe('2026-09-30T14:00:00.000Z'); // 1 Oct 00:00 +10 (clocks changed on 4 Oct)
  });

  it('treats Monday itself as the first day of the week', () => {
    const b = periodBounds(new Date('2026-10-12T01:00:00Z')); // Mon 12 Oct 12:00 Sydney
    expect(iso(b.weekStart)).toBe(iso(b.today));
  });

  it('steps back across a month end and uses the winter offset (+10) outside daylight saving', () => {
    // Wednesday 1 Jul 2026 in Sydney: the week began Monday 29 Jun
    const b = periodBounds(new Date('2026-07-01T02:00:00Z'));
    expect(iso(b.weekStart)).toBe('2026-06-28T14:00:00.000Z'); // 29 Jun 00:00 +10
    expect(iso(b.monthStart)).toBe('2026-06-30T14:00:00.000Z'); // 1 Jul 00:00 +10
  });

  it('handles the day daylight saving starts (4 Oct 2026, clocks go forward at 2am)', () => {
    const b = periodBounds(new Date('2026-10-04T05:00:00Z'));
    expect(iso(b.today)).toBe('2026-10-03T14:00:00.000Z'); // 4 Oct 00:00 +10 (before the change at 2am)
  });
});
