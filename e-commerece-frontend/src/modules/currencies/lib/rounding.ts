// The rounding choices shown to the owner, in plain words. The number is what the server stores:
// converted prices are rounded UP to a multiple of that many cents (the currency's hundredths).
export const ROUNDING_CHOICES = [
  { value: 1, label: "Exact, no rounding" },
  { value: 5, label: "Up to the next 5 cents" },
  { value: 10, label: "Up to the next 10 cents" },
  { value: 100, label: "Up to the next whole dollar" },
  { value: 500, label: "Up to the next 5 dollars" },
  { value: 1000, label: "Up to the next 10 dollars" },
] as const;

export function roundingLabel(roundTo: number): string {
  return ROUNDING_CHOICES.find((c) => c.value === roundTo)?.label ?? `Up to a multiple of ${roundTo} cents`;
}
