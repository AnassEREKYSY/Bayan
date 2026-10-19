/**
 * Parses closing prices pasted by an admin, for markets without a price API
 * (Bourse de Casablanca). One row per line: a date and a closing price.
 *
 * Accepted, mixed freely:
 *   2026-10-16,712.5          ISO date, comma separator
 *   16/10/2026;712,50         French date, semicolon, decimal comma
 *   16/10/2026  1 712,50      tab/space separator, spaces as thousands
 * A header line and blank lines are ignored.
 */

export interface PricePoint {
  date: string; // YYYY-MM-DD
  close: number;
}

export interface PriceImportResult {
  points: PricePoint[]; // sorted by date, one per day (last one wins)
  badLines: number[]; // 1-based line numbers that could not be read
}

export const MAX_PRICE_LINES = 3000;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const FR = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;

function parseDate(raw: string): string | null {
  let y: string, m: string, d: string;
  const iso = ISO.exec(raw);
  const fr = FR.exec(raw);
  if (iso) [, y, m, d] = iso as unknown as [string, string, string, string];
  else if (fr) [, d, m, y] = fr as unknown as [string, string, string, string];
  else return null;
  const date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const t = Date.parse(`${date}T00:00:00Z`);
  // Reject impossible dates such as 31/02 (Date rolls them over).
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== date) return null;
  return date;
}

function parsePrice(raw: string): number | null {
  // Drop spaces (incl. non-breaking) used as thousands separators.
  let s = raw.replace(/[\s  ]/g, "");
  if (s.includes(",") && s.includes(".")) {
    // "1.712,50" (FR) or "1,712.50" (EN): the last symbol is the decimal mark.
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else {
    s = s.replace(",", ".");
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parsePriceRows(text: string, today = new Date().toISOString().slice(0, 10)): PriceImportResult {
  const byDate = new Map<string, number>();
  const badLines: number[] = [];
  const lines = text.split(/\r?\n/).slice(0, MAX_PRICE_LINES);

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    // Date first, then everything after the first separator is the price.
    const match = /^(\S+?)\s*[;,\t]\s*(.+)$/.exec(trimmed) ?? /^(\S+)\s+(.+)$/.exec(trimmed);
    const date = match ? parseDate(match[1]!) : null;
    const close = match ? parsePrice(match[2]!) : null;
    if (!date || close == null || date > today) {
      // A first line that is not a date is a header, not an error.
      if (!(i === 0 && !/^\d/.test(trimmed))) badLines.push(i + 1);
      return;
    }
    byDate.set(date, close);
  });

  const points = [...byDate].map(([date, close]) => ({ date, close })).sort((a, b) => a.date.localeCompare(b.date));
  return { points, badLines };
}
