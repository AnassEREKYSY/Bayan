/**
 * Guards against AI summaries that invent figures: every number that
 * appears in a summary must also appear in the source text.
 */

const NUMBER_PATTERN = /\d[\d\s.,  ]*\d|\d/g;

/** Normalises "1 234,50", "1,234.50" and "1234.5" to the same canonical form. */
export function normaliseNumber(raw: string): string {
  let s = raw.replace(/[\s  ]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const decimalSep = lastComma > lastDot ? "," : ".";
  const decimalIdx = decimalSep === "," ? lastComma : lastDot;
  const decimals = decimalIdx >= 0 ? s.length - decimalIdx - 1 : 0;

  // A single separator followed by exactly 3 digits is a thousands separator.
  const separators = (s.match(/[.,]/g) ?? []).length;
  if (separators === 1 && decimals === 3) {
    s = s.replace(/[.,]/g, "");
  } else if (decimalIdx >= 0) {
    const intPart = s.slice(0, decimalIdx).replace(/[.,]/g, "");
    const fracPart = s.slice(decimalIdx + 1);
    s = `${intPart}.${fracPart}`;
  }

  const n = Number(s);
  return Number.isFinite(n) ? String(n) : s;
}

export function extractNumbers(text: string): string[] {
  return (text.match(NUMBER_PATTERN) ?? []).map(normaliseNumber);
}

/** True when every number in the summary also appears in the source. */
export function summaryNumbersSupported(summary: string, source: string): boolean {
  const available = new Set(extractNumbers(source));
  return extractNumbers(summary).every((n) => available.has(n));
}
