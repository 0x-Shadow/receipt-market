const RATES: Record<number, number> = { 1: 13, 2: 9, 3: 5, 4: 0, 5: 4, 6: 0, 7: 0, 8: 0 };

export function vatRateFor(category: number): number | null {
  return Object.prototype.hasOwnProperty.call(RATES, category) ? RATES[category] : null;
}

export function isVatConsistent(category: number, netValue: number, vatAmount: number): boolean {
  const rate = vatRateFor(category);
  if (rate === null) return false;
  const expected = Math.round(netValue * (rate / 100) * 100) / 100;
  return Math.abs(expected - vatAmount) < 0.02;
}
