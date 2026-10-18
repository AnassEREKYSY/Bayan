import "server-only";

import type { z } from "zod";

import {
  catalogQuerySchema,
  fromGecko,
  fromTwelve,
  geckoCoin,
  geckoSearch,
  twelveSearch,
  type CatalogHit,
  type importSchema,
} from "@/domain/catalog";
import type { ServerEnv } from "@/lib/env.server";

export { importSchema, keywordsFor, type CatalogHit } from "@/domain/catalog";

/**
 * Search the providers' full catalogues for assets Bayan doesn't track yet.
 * Results are only suggestions: an import re-checks the asset with the
 * provider (resolveCatalogHit) and never trusts what the browser sends.
 */

const ONE_DAY = 60 * 60 * 24;
const TIMEOUT_MS = 6_000;

/** Catalogue lookups change rarely: let Next cache them for a day. */
async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": "BayanBot/1.0", ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: ONE_DAY },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${new URL(url).host}`);
  return res.json();
}

// ─── Twelve Data ────────────────────────────────────────────────────────────
async function searchTwelve(query: string, apiKey: string): Promise<CatalogHit[]> {
  const raw = await getJson(
    `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&outputsize=30&show_plan=true&apikey=${apiKey}`,
  );
  const data = twelveSearch.parse(raw).data ?? [];
  return data.flatMap((d) => fromTwelve(d, true) ?? []);
}

// ─── CoinGecko ──────────────────────────────────────────────────────────────
async function searchGecko(query: string, apiKey?: string): Promise<CatalogHit[]> {
  const headers: Record<string, string> = apiKey ? { "x-cg-demo-api-key": apiKey } : {};
  const raw = await getJson(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`, headers);
  const coins = (geckoSearch.parse(raw).coins ?? []).flatMap((c) => {
    const parsed = geckoCoin.safeParse(c);
    return parsed.success ? [parsed.data] : [];
  });
  // Ranked coins first: they are the ones people actually mean.
  return coins
    .sort((a, b) => (a.market_cap_rank ?? 1e9) - (b.market_cap_rank ?? 1e9))
    .slice(0, 8)
    .map(fromGecko);
}

// ─── Public API ─────────────────────────────────────────────────────────────
// ─── Public API ─────────────────────────────────────────────────────────────
/** Search all configured catalogues. Never throws: a failing source is skipped. */
export async function searchCatalog(query: string, env: ServerEnv): Promise<CatalogHit[]> {
  const q = catalogQuerySchema.safeParse(query);
  if (!q.success) return [];
  const tasks: Promise<CatalogHit[]>[] = [searchGecko(q.data, env.COINGECKO_API_KEY)];
  if (env.TWELVE_DATA_API_KEY) tasks.unshift(searchTwelve(q.data, env.TWELVE_DATA_API_KEY));
  const settled = await Promise.allSettled(tasks);
  const hits = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  // One entry per provider reference.
  return [...new Map(hits.map((h) => [`${h.provider}:${h.ref}`, h])).values()].slice(0, 20);
}

/** Look the asset up again at the provider, so imports only store real data. */
export async function resolveCatalogHit(input: z.infer<typeof importSchema>, env: ServerEnv): Promise<CatalogHit | null> {
  if (input.provider === "coingecko") {
    const headers: Record<string, string> = env.COINGECKO_API_KEY ? { "x-cg-demo-api-key": env.COINGECKO_API_KEY } : {};
    const raw = await getJson(
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(input.ref)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`,
      headers,
    );
    const parsed = geckoCoin.safeParse(raw);
    return parsed.success && parsed.data.id === input.ref ? fromGecko(parsed.data) : null;
  }

  if (!env.TWELVE_DATA_API_KEY) return null;
  const [symbol] = input.ref.split("|");
  const raw = await getJson(
    `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(symbol!)}&outputsize=120&show_plan=true&apikey=${env.TWELVE_DATA_API_KEY}`,
  );
  const data = twelveSearch.parse(raw).data ?? [];
  for (const d of data) {
    const hit = fromTwelve(d, true);
    if (hit && hit.ref === input.ref) return hit;
  }
  return null;
}

