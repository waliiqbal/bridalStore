// Amount is always an integer in the currency's smallest unit (cents).
export interface Money {
  amount: number;
  currencyCode: string;
}

export function money(amount: number, currencyCode: string): Money {
  if (!Number.isSafeInteger(amount)) {
    throw new Error(`Money amount must be an integer in cents, got ${amount}`);
  }
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error(`Invalid currency code: ${currencyCode}`);
  }
  return { amount, currencyCode };
}
