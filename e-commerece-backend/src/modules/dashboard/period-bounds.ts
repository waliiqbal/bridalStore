// "Today", "this week" and "this month" as the shop's owner sees them (Australia), not as the
// server's clock sees them. Pure functions, tested in period-bounds.spec.ts.

export const SHOP_TIME_ZONE = 'Australia/Sydney';

interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 0 = Sunday
}

function localParts(instant: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
  };
}

// How far the time zone is ahead of UTC at this instant, in minutes
function offsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
}

// The moment local midnight starts on year-month-day in that time zone
function localMidnight(year: number, month: number, day: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day);
  // Offsets change on daylight-saving days, so check the answer once more
  const first = guess - offsetMinutes(new Date(guess), timeZone) * 60_000;
  return new Date(guess - offsetMinutes(new Date(first), timeZone) * 60_000);
}

export interface PeriodBounds {
  today: Date;
  // Monday 00:00
  weekStart: Date;
  monthStart: Date;
}

export function periodBounds(now: Date, timeZone = SHOP_TIME_ZONE): PeriodBounds {
  const { year, month, day, weekday } = localParts(now, timeZone);
  const sinceMonday = (weekday + 6) % 7;
  // Date.UTC handles stepping back across month ends
  const monday = new Date(Date.UTC(year, month - 1, day - sinceMonday));
  return {
    today: localMidnight(year, month, day, timeZone),
    weekStart: localMidnight(
      monday.getUTCFullYear(),
      monday.getUTCMonth() + 1,
      monday.getUTCDate(),
      timeZone,
    ),
    monthStart: localMidnight(year, month, 1, timeZone),
  };
}
