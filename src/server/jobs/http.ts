import "server-only";

const MAX_BYTES = 5 * 1024 * 1024;

/** fetch with a timeout and a response-size cap; throws on non-2xx. */
export async function fetchText(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<string> {
  const { timeoutMs = 15_000, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
    headers: { "User-Agent": "BayanBot/1.0 (+https://github.com/)", ...rest.headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${new URL(url).host}`);
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) throw new Error(`Response too large from ${new URL(url).host}`);
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new Error(`Response too large from ${new URL(url).host}`);
  return text;
}

export async function fetchJson<T>(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  return JSON.parse(await fetchText(url, init)) as T;
}

export const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function toNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return isFiniteNumber(n) ? n : null;
}
