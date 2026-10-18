import "server-only";

import type { AssetInfo, PricePoint, Quote } from "@/domain/portfolio";
import type { FxTable } from "@/domain/money";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/supabase/database.types";

export type Asset = Tables<"assets">;
export type AssetWithQuote = Asset & { quote: Tables<"asset_quotes"> | null };

export const toAssetInfo = (a: Asset): AssetInfo => ({
  id: a.id,
  symbol: a.symbol,
  name: a.name,
  currency: a.currency,
  assetClass: a.asset_class,
  market: a.market,
});

export async function listAssets(
  supabase: ServerSupabase,
  opts: { market?: Enums<"market">; search?: string; limit?: number } = {},
): Promise<AssetWithQuote[]> {
  let query = supabase
    .from("assets")
    .select("*, quote:asset_quotes(*)")
    .eq("is_active", true)
    .order("market")
    .order("symbol")
    .limit(opts.limit ?? 300);

  if (opts.market) query = query.eq("market", opts.market);
  if (opts.search) {
    // Escape PostgREST pattern characters before building the filter.
    const term = opts.search.replace(/[%_,()*\\]/g, "").slice(0, 40);
    if (term) query = query.or(`symbol.ilike.%${term}%,name.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as AssetWithQuote[];
}

export async function getAsset(supabase: ServerSupabase, id: string): Promise<AssetWithQuote | null> {
  const { data, error } = await supabase
    .from("assets")
    .select("*, quote:asset_quotes(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as AssetWithQuote | null;
}

export async function getAssetsByIds(supabase: ServerSupabase, ids: readonly string[]) {
  if (ids.length === 0) return new Map<string, Asset>();
  const { data, error } = await supabase.from("assets").select("*").in("id", [...ids]);
  if (error) throw error;
  return new Map((data ?? []).map((a) => [a.id, a]));
}

export async function getQuotes(supabase: ServerSupabase, ids: readonly string[]) {
  const map = new Map<string, Quote & { asOf: string }>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase.from("asset_quotes").select("*").in("asset_id", [...ids]);
  if (error) throw error;
  for (const q of data ?? []) {
    map.set(q.asset_id, { price: Number(q.price), previousClose: q.previous_close == null ? null : Number(q.previous_close), asOf: q.as_of });
  }
  return map;
}

export async function getFx(supabase: ServerSupabase): Promise<{ fx: FxTable; asOf: string | null }> {
  const { data, error } = await supabase.from("fx_rates").select("*");
  if (error) throw error;
  const fx: Record<string, number> = { USD: 1 };
  let asOf: string | null = null;
  for (const r of data ?? []) {
    fx[r.quote] = Number(r.rate);
    if (!asOf || r.as_of > asOf) asOf = r.as_of;
  }
  return { fx, asOf };
}

export async function getPriceHistory(
  supabase: ServerSupabase,
  ids: readonly string[],
  fromDate: string,
): Promise<Map<string, PricePoint[]>> {
  const map = new Map<string, PricePoint[]>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase
    .from("asset_prices")
    .select("asset_id, price_date, close")
    .in("asset_id", [...ids])
    .gte("price_date", fromDate)
    .order("price_date", { ascending: true })
    .limit(20000);
  if (error) throw error;
  for (const row of data ?? []) {
    const list = map.get(row.asset_id) ?? [];
    list.push({ date: row.price_date, close: Number(row.close) });
    map.set(row.asset_id, list);
  }
  return map;
}
