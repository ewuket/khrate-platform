/**
 * KHRATE money handling.
 *
 * RULE (see docs/engineering/04_ARCHITECTURE.md): money is stored and computed as
 * integer *minor units* alongside its currency. NEVER use floats for money.
 *
 * RWF (Rwandan Franc) — KHRATE's launch currency — has NO minor unit: 1 RWF = 1 unit.
 * USD/KES/etc. have 2 minor units. This table drives formatting only; arithmetic is
 * always on the integer amount and never crosses currencies.
 */

export type CurrencyCode = 'RWF' | 'USD' | 'KES' | 'UGX' | 'TZS';

/** Number of minor-unit decimal places per currency. */
export const CURRENCY_DECIMALS: Record<CurrencyCode, number> = {
  RWF: 0,
  UGX: 0,
  TZS: 0,
  KES: 2,
  USD: 2,
};

export interface Money {
  /** Integer amount in minor units (e.g. RWF 1500 = 1500; USD $1.50 = 150). */
  readonly amount: number;
  readonly currency: CurrencyCode;
}

export function money(amount: number, currency: CurrencyCode): Money {
  if (!Number.isInteger(amount)) {
    throw new Error(`Money amount must be an integer in minor units, got ${amount}`);
  }
  return { amount, currency };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

/** Multiply by an integer quantity (e.g. unit price × units). */
export function multiply(a: Money, qty: number): Money {
  if (!Number.isInteger(qty)) {
    throw new Error(`Quantity must be an integer, got ${qty}`);
  }
  return money(a.amount * qty, a.currency);
}

export function isZero(a: Money): boolean {
  return a.amount === 0;
}

export function isNegative(a: Money): boolean {
  return a.amount < 0;
}

/** The saving of a group price vs. a solo price, as a non-negative Money and a percent. */
export function saving(solo: Money, group: Money): { amount: Money; percent: number } {
  assertSameCurrency(solo, group);
  const diff = Math.max(0, solo.amount - group.amount);
  const percent = solo.amount > 0 ? Math.round((diff / solo.amount) * 100) : 0;
  return { amount: money(diff, solo.currency), percent };
}

/** Human-readable format, e.g. "RWF 1,500" or "USD 1.50". */
export function format(m: Money): string {
  const decimals = CURRENCY_DECIMALS[m.currency];
  const major = m.amount / Math.pow(10, decimals);
  const formatted = major.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${m.currency} ${formatted}`;
}
