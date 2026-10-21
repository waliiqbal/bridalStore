// Small pure rules for reviews (tested in review-rules.spec.ts).

// "Ayesha K." — the public never sees a full surname
export function reviewerName(firstName: string | null, lastName: string | null): string {
  const first = firstName?.trim();
  const last = lastName?.trim();
  if (first && last) return `${first} ${last[0]!.toUpperCase()}.`;
  return first || 'Customer';
}

// Average to one decimal (4.5), or null when nobody has rated yet
export function ratingSummary(count: number, total: number): { count: number; average: number | null } {
  return { count, average: count > 0 ? Math.round((total / count) * 10) / 10 : null };
}
