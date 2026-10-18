import { z } from "zod";

import type { Enums } from "@/lib/supabase/database.types";

/**
 * Pure mapping from the providers' catalogue formats to Bayan's asset model.
 * Network calls live in server/market/catalog.ts; this file is unit-tested.
 */

export type CatalogProvider = "twelvedata" | "coingecko";

export interface CatalogHit {
  provider: CatalogProvider;
  /** What Bayan stores in assets.provider_ref. */
  ref: string;
  symbol: string;
  name: string;
  market: Extract<Enums<"market">, "us" | "europe" | "crypto">;
  assetClass: Extract<Enums<"asset_class">, "stock" | "etf" | "crypto">;
  currency: string;
  exchange: string | null;
}

// ─── Twelve Data ────────────────────────────────────────────────────────────
const US_COUNTRIES = new Set(["United States"]);
const EUROPE_COUNTRIES = new Set([
  "France", "Germany", "Netherlands", "Belgium", "Spain", "Italy", "Portugal", "Ireland", "Luxembourg",
  "Switzerland", "United Kingdom", "Austria", "Sweden", "Denmark", "Norway", "Finland",
]);
const PAID_TIERS = new Set(["grow", "pro", "ultra", "venture", "enterprise"]);
const STOCK_TYPES = new Set(["Common Stock", "Depositary Receipt", "Preferred Stock", "REIT"]);

const twelveHit = z.object({
  symbol: z.string().min(1).max(15),
  instrument_name: z.string().min(1),
  exchange: z.string().min(1),
  mic_code: z.string().regex(/^[A-Z0-9]{4}$/),
  instrument_type: z.string(),
  country: z.string(),
  currency: z.string().length(3),
  access: z.object({ global: z.string().optional(), plan: z.string().optional() }).partial().optional(),
});
export const twelveSearch = z.object({ data: z.array(z.unknown()).optional() });

export function fromTwelve(raw: unknown, freePlanOnly: boolean): CatalogHit | null {
  const parsed = twelveHit.safeParse(raw);
  if (!parsed.success) return null;
  const h = parsed.data;
  // The free Basic plan cannot price every exchange; hide what needs a paid tier.
  if (freePlanOnly && PAID_TIERS.has((h.access?.global ?? "").toLowerCase())) return null;
  if (h.exchange === "OTC") return null;
  const market = US_COUNTRIES.has(h.country) ? "us" : EUROPE_COUNTRIES.has(h.country) ? "europe" : null;
  if (!market) return null;
  const assetClass = h.instrument_type === "ETF" ? "etf" : STOCK_TYPES.has(h.instrument_type) ? "stock" : null;
  if (!assetClass) return null;
  return {
    provider: "twelvedata",
    ref: `${h.symbol}|${h.mic_code}`,
    symbol: h.symbol.toUpperCase(),
    name: h.instrument_name.slice(0, 120),
    market,
    assetClass,
    currency: h.currency.toUpperCase(),
    exchange: h.exchange,
  };
}

// ─── CoinGecko ──────────────────────────────────────────────────────────────
export const geckoCoin = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  name: z.string().min(1),
  symbol: z.string().min(1).max(15),
  market_cap_rank: z.number().nullable().optional(),
});
export const geckoSearch = z.object({ coins: z.array(z.unknown()).optional() });

export const fromGecko = (c: z.infer<typeof geckoCoin>): CatalogHit => ({
  provider: "coingecko",
  ref: c.id,
  symbol: c.symbol.toUpperCase(),
  name: c.name.slice(0, 120),
  market: "crypto",
  assetClass: "crypto",
  currency: "USD",
  exchange: null,
});

export const catalogQuerySchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[\p{L}\p{N} .&'-]+$/u);

export const importSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("twelvedata"), ref: z.string().regex(/^[A-Za-z0-9.\-]{1,15}\|[A-Z0-9]{4}$/) }),
  z.object({ provider: z.literal("coingecko"), ref: z.string().regex(/^[a-z0-9-]{1,80}$/) }),
]);

/** Simple news keywords from a company name ("Apple Inc." → "apple"). */
export function keywordsFor(hit: CatalogHit): string[] {
  const base = hit.name
    .toLowerCase()
    .replace(/\b(inc|corp|corporation|co|ltd|plc|sa|se|ag|nv|n\.v|s\.a|group|holdings?|class [a-z]|ordinary shares?|common stock|etf)\b\.?/g, " ")
    .replace(/[^\p{L}\p{N}&' -]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base.length >= 3 ? [base] : [];
}
