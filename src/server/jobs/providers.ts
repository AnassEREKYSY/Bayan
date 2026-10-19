import "server-only";

import { z } from "zod";

import type { ServerEnv } from "@/lib/env.server";
import type { Tables } from "@/lib/supabase/database.types";

import { fetchJson, toNumber } from "./http";

/**
 * Market data adapters. Each provider turns its own API format into the
 * same QuoteResult/HistoryPoint shape, so sources can be swapped freely.
 */

export interface QuoteResult {
  assetId: string;
  price: number;
  previousClose: number | null;
  asOf: string;
  source: string;
}

export interface HistoryPoint {
  date: string;
  close: number;
}

export type ProviderAsset = Pick<Tables<"assets">, "id" | "symbol" | "market" | "provider_ref">;
type Asset = ProviderAsset;

export interface MarketDataProvider {
  readonly name: string;
  supports(asset: Asset): boolean;
  /** Max assets per request round, to stay within free-tier limits. */
  readonly batchSize: number;
  /** Minimum pause between two rounds (per-minute limits), in ms. */
  readonly roundPauseMs?: number;
  quotes(assets: Asset[]): Promise<QuoteResult[]>;
  history?(asset: Asset, days: number): Promise<HistoryPoint[]>;
}

const refOf = (a: Asset) => a.provider_ref ?? a.symbol;

// ─── CoinGecko (crypto) ─────────────────────────────────────────────────────
export function coinGecko(apiKey?: string): MarketDataProvider {
  const base = "https://api.coingecko.com/api/v3";
  const headers: Record<string, string> = apiKey ? { "x-cg-demo-api-key": apiKey } : {};

  return {
    name: "coingecko",
    batchSize: 100,
    supports: (a) => a.market === "crypto",
    async quotes(assets) {
      if (assets.length === 0) return [];
      const ids = assets.map(refOf).join(",");
      const data = await fetchJson<Record<string, { usd?: number; usd_24h_change?: number; last_updated_at?: number }>>(
        `${base}/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`,
        { headers },
      );
      return assets.flatMap((a) => {
        const row = data[refOf(a)];
        const price = toNumber(row?.usd);
        if (price == null) return [];
        const change = toNumber(row?.usd_24h_change);
        return [
          {
            assetId: a.id,
            price,
            previousClose: change != null ? price / (1 + change / 100) : null,
            asOf: new Date((row?.last_updated_at ?? Date.now() / 1000) * 1000).toISOString(),
            source: "coingecko",
          },
        ];
      });
    },
    async history(asset, days) {
      const data = await fetchJson<{ prices?: [number, number][] }>(
        `${base}/coins/${encodeURIComponent(refOf(asset))}/market_chart?vs_currency=usd&days=${days}&interval=daily`,
        { headers },
      );
      const byDate = new Map<string, number>();
      for (const [ts, close] of data.prices ?? []) byDate.set(new Date(ts).toISOString().slice(0, 10), close);
      return [...byDate].map(([date, close]) => ({ date, close }));
    },
  };
}

// ─── Twelve Data (US & Europe stocks/ETFs, gold, silver) ────────────────────
const twelveQuote = z.object({
  close: z.string(),
  previous_close: z.string().optional(),
  timestamp: z.number().optional(),
  status: z.string().optional(),
});

export function twelveData(apiKey: string, { casablanca = false } = {}): MarketDataProvider {
  const base = "https://api.twelvedata.com";
  // provider_ref is "SYMBOL", "SYMBOL|Exchange name" or "SYMBOL|MIC" (e.g. MC|XPAR).
  // Casablanca tickers are stored bare ("AKT") and sent with the XCAS MIC.
  const params = (a: Asset) => {
    const ref = a.market === "casablanca" && !refOf(a).includes("|") ? `${refOf(a)}|XCAS` : refOf(a);
    const [symbol, venue] = ref.split("|");
    const venueParam = !venue ? "" : /^[A-Z0-9]{4}$/.test(venue) ? `&mic_code=${venue}` : `&exchange=${encodeURIComponent(venue)}`;
    return `symbol=${encodeURIComponent(symbol ?? a.symbol)}${venueParam}`;
  };

  return {
    name: "twelvedata",
    // Free plan: 8 credits per minute, 800 per day. One credit per asset.
    batchSize: 8,
    roundPauseMs: 61_000,
    supports: (a) =>
      a.market === "us" || a.market === "europe" || a.market === "commodities" || (casablanca && a.market === "casablanca"),
    async quotes(assets) {
      const results = await Promise.allSettled(
        assets.map(async (a): Promise<QuoteResult | null> => {
          const raw = await fetchJson<unknown>(`${base}/quote?${params(a)}&apikey=${apiKey}`);
          const parsed = twelveQuote.safeParse(raw);
          if (!parsed.success || parsed.data.status === "error") return null;
          const price = toNumber(parsed.data.close);
          if (price == null) return null;
          return {
            assetId: a.id,
            price,
            previousClose: toNumber(parsed.data.previous_close),
            asOf: new Date((parsed.data.timestamp ?? Date.now() / 1000) * 1000).toISOString(),
            source: "twelvedata",
          };
        }),
      );
      return results.flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value] : []));
    },
    async history(asset, days) {
      const data = await fetchJson<{ values?: { datetime: string; close: string }[] }>(
        `${base}/time_series?${params(asset)}&interval=1day&outputsize=${Math.min(days, 5000)}&apikey=${apiKey}`,
      );
      return (data.values ?? []).flatMap((v) => {
        const close = toNumber(v.close);
        return close == null ? [] : [{ date: v.datetime.slice(0, 10), close }];
      });
    },
  };
}

// ─── Bourse de Casablanca (your own JSON feed) ──────────────────────────────
const casablancaFeed = z.object({
  asOf: z.string(),
  quotes: z.array(
    z.object({
      symbol: z.string(),
      price: z.number().nonnegative(),
      previousClose: z.number().nonnegative().nullable().optional(),
    }),
  ),
});

export function casablanca(feedUrl: string): MarketDataProvider {
  return {
    name: "casablanca-feed",
    batchSize: 500,
    supports: (a) => a.market === "casablanca",
    async quotes(assets) {
      const feed = casablancaFeed.parse(await fetchJson<unknown>(feedUrl));
      const bySymbol = new Map(feed.quotes.map((q) => [q.symbol.toUpperCase(), q]));
      const asOf = new Date(feed.asOf).toISOString();
      return assets.flatMap((a) => {
        const q = bySymbol.get(refOf(a).toUpperCase());
        return q
          ? [{ assetId: a.id, price: q.price, previousClose: q.previousClose ?? null, asOf, source: "casablanca-feed" }]
          : [];
      });
    },
  };
}

/** Providers enabled by the configured keys. */
export function configuredProviders(env: ServerEnv): MarketDataProvider[] {
  const list: MarketDataProvider[] = [coinGecko(env.COINGECKO_API_KEY)];
  // A dedicated Casablanca feed, when set, wins over Twelve Data for that market.
  if (env.CASABLANCA_FEED_URL) list.push(casablanca(env.CASABLANCA_FEED_URL));
  if (env.TWELVE_DATA_API_KEY) {
    list.push(twelveData(env.TWELVE_DATA_API_KEY, { casablanca: env.TWELVE_DATA_CASABLANCA && !env.CASABLANCA_FEED_URL }));
  }
  return list;
}

// ─── FX rates (free, no key) ────────────────────────────────────────────────
const fxResponse = z.object({
  result: z.literal("success"),
  time_last_update_unix: z.number(),
  rates: z.record(z.string(), z.number().positive()),
});

export async function fetchFxRates(): Promise<{ asOf: string; rates: Record<string, number> }> {
  const data = fxResponse.parse(await fetchJson<unknown>("https://open.er-api.com/v6/latest/USD"));
  return { asOf: new Date(data.time_last_update_unix * 1000).toISOString(), rates: data.rates };
}
