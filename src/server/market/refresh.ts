import "server-only";

import { serverEnv } from "@/lib/env.server";
import type { AdminSupabase } from "@/lib/supabase/admin";

import { configuredProviders, type ProviderAsset } from "../jobs/providers";

/** How old a price may be before an asset page asks for a new one. */
const STALE_AFTER_MS = { crypto: 30 * 60_000, other: 6 * 60 * 60_000 } as const;
/** Minimum gap between two on-demand attempts for the same asset. */
const RETRY_AFTER_MS = 30 * 60_000;
/** An asset page never waits longer than this for a provider. */
const MAX_WAIT_MS = 6_000;
const HISTORY_DAYS = 365;
const MIN_HISTORY_POINTS = 30;

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

/**
 * Fetch the latest price (and a year of history when missing) for one asset.
 * Best-effort: returns false instead of throwing when no source can help.
 */
export async function refreshAsset(db: AdminSupabase, asset: ProviderAsset, { history }: { history: boolean }) {
  const provider = configuredProviders(serverEnv()).find((p) => p.supports(asset));
  if (!provider) return false;

  const [quote] = await provider.quotes([asset]);
  if (quote) {
    const now = new Date().toISOString();
    await db.from("asset_quotes").upsert({
      asset_id: asset.id,
      price: quote.price,
      previous_close: quote.previousClose,
      as_of: quote.asOf,
      source: quote.source,
      updated_at: now,
    });
    await db.from("asset_prices").upsert({ asset_id: asset.id, price_date: quote.asOf.slice(0, 10), close: quote.price });
  }

  if (history && provider.history) {
    const { count } = await db.from("asset_prices").select("asset_id", { count: "exact", head: true }).eq("asset_id", asset.id);
    if ((count ?? 0) < MIN_HISTORY_POINTS) {
      const points = await provider.history(asset, HISTORY_DAYS);
      if (points.length) {
        await db.from("asset_prices").upsert(points.map((p) => ({ asset_id: asset.id, price_date: p.date, close: p.close })));
      }
    }
  }
  return Boolean(quote);
}

/**
 * Called when someone opens an asset page: refresh it if its price is stale.
 * The conditional update "claims" the refresh, so concurrent page views and
 * failing sources can't spend the free API quota over and over.
 */
export async function ensureFreshAsset(db: AdminSupabase, assetId: string) {
  const { data: asset } = await db
    .from("assets")
    .select("id, symbol, market, provider_ref, quote:asset_quotes(updated_at)")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset) return;

  const row = asset as unknown as ProviderAsset & { quote: { updated_at: string } | null };
  const limit = row.market === "crypto" ? STALE_AFTER_MS.crypto : STALE_AFTER_MS.other;
  const age = row.quote ? Date.now() - Date.parse(row.quote.updated_at) : Infinity;
  if (age < limit) return;

  const retryBefore = new Date(Date.now() - RETRY_AFTER_MS).toISOString();
  const { data: claimed } = await db
    .from("assets")
    .update({ refresh_attempted_at: new Date().toISOString() })
    .eq("id", assetId)
    .or(`refresh_attempted_at.is.null,refresh_attempted_at.lt.${retryBefore}`)
    .select("id");
  if (!claimed?.length) return;

  try {
    await withTimeout(refreshAsset(db, row, { history: true }), MAX_WAIT_MS);
  } catch {
    // Shown with the last known price; the daily refresh will try again.
  }
}
