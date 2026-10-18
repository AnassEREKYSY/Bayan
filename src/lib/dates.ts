const DAY_MS = 86_400_000;

/** YYYY-MM-DD for today shifted by `days` (UTC). */
export function isoDay(days = 0): string {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}
