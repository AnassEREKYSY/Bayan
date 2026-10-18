export const baseCurrencies = ["MAD", "EUR", "USD"] as const;
export type BaseCurrency = (typeof baseCurrencies)[number];

/** Units of each currency per 1 USD, e.g. { USD: 1, EUR: 0.86, MAD: 9.1 }. */
export type FxTable = Readonly<Record<string, number>>;

export class MissingFxRateError extends Error {
  constructor(currency: string) {
    super(`Missing FX rate for ${currency}`);
    this.name = "MissingFxRateError";
  }
}

/** Convert an amount between currencies through USD. */
export function convert(amount: number, from: string, to: string, fx: FxTable): number {
  if (from === to) return amount;
  const fromRate = from === "USD" ? 1 : fx[from];
  const toRate = to === "USD" ? 1 : fx[to];
  if (!fromRate) throw new MissingFxRateError(from);
  if (!toRate) throw new MissingFxRateError(to);
  return (amount / fromRate) * toRate;
}

/** Same as convert, but returns null instead of throwing when a rate is missing. */
export function tryConvert(amount: number, from: string, to: string, fx: FxTable): number | null {
  try {
    return convert(amount, from, to, fx);
  } catch (e) {
    if (e instanceof MissingFxRateError) return null;
    throw e;
  }
}

// fr-FR groups thousands with a narrow space ("48 230,50"), the usual style in Moroccan financial press.
const intlLocale = (locale: string) => (locale === "fr" ? "fr-FR" : "en-US");

export function formatMoney(value: number, currency: string, locale: string, opts?: { compact?: boolean }) {
  const abs = Math.abs(value);
  const digits = abs !== 0 && abs < 1 ? 4 : 2;
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    currencyDisplay: currency === "MAD" ? "code" : "symbol",
    notation: opts?.compact ? "compact" : "standard",
    minimumFractionDigits: opts?.compact ? 0 : 2,
    maximumFractionDigits: opts?.compact ? 1 : digits,
  }).format(value);
}

export function formatNumber(value: number, locale: string, maxDigits = 2) {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: maxDigits }).format(value);
}

export function formatQuantity(value: number, locale: string) {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 8 }).format(value);
}

/** 0.0523 → "+5.23 %" (sign always shown). */
export function formatPercent(ratio: number, locale: string, opts?: { signed?: boolean }) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: opts?.signed === false ? "auto" : "exceptZero",
  }).format(ratio);
}

export type Trend = "up" | "down" | "flat";
export function trendOf(value: number | null | undefined, epsilon = 1e-9): Trend {
  if (value == null || Math.abs(value) < epsilon) return "flat";
  return value > 0 ? "up" : "down";
}
