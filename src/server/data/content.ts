import "server-only";

import type { ServerSupabase } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

import type { Asset } from "./market";

export type NewsItem = Tables<"news_items"> & { assets: Pick<Asset, "id" | "symbol" | "name">[] };
export type CorporateEvent = Tables<"corporate_events"> & { asset: Pick<Asset, "id" | "symbol" | "name" | "currency"> };
export type AlertRule = Tables<"alert_rules"> & { asset: Pick<Asset, "id" | "symbol" | "name" | "currency"> };
export type Notification = Tables<"notifications">;

type NewsRow = Tables<"news_items"> & {
  news_item_assets: { asset: Pick<Asset, "id" | "symbol" | "name"> | null }[];
};

const flattenNews = (rows: NewsRow[]): NewsItem[] =>
  rows.map(({ news_item_assets, ...n }) => ({
    ...n,
    assets: news_item_assets.map((x) => x.asset).filter((a): a is NonNullable<typeof a> => a != null),
  }));

/** News, optionally limited to a set of assets. */
export async function listNews(
  supabase: ServerSupabase,
  opts: { assetIds?: readonly string[]; limit?: number; before?: string } = {},
): Promise<NewsItem[]> {
  const limit = opts.limit ?? 30;

  if (opts.assetIds) {
    if (opts.assetIds.length === 0) return [];
    const { data, error } = await supabase
      .from("news_items")
      .select("*, news_item_assets!inner(asset:assets(id, symbol, name))")
      .in("news_item_assets.asset_id", [...opts.assetIds])
      .lt("published_at", opts.before ?? "9999-12-31")
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return flattenNews((data ?? []) as unknown as NewsRow[]);
  }

  const { data, error } = await supabase
    .from("news_items")
    .select("*, news_item_assets(asset:assets(id, symbol, name))")
    .lt("published_at", opts.before ?? "9999-12-31")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return flattenNews((data ?? []) as unknown as NewsRow[]);
}

export async function listEvents(
  supabase: ServerSupabase,
  opts: { from: string; to: string; assetIds?: readonly string[] },
): Promise<CorporateEvent[]> {
  let query = supabase
    .from("corporate_events")
    .select("*, asset:assets(id, symbol, name, currency)")
    .gte("event_date", opts.from)
    .lte("event_date", opts.to)
    .order("event_date");
  if (opts.assetIds) {
    if (opts.assetIds.length === 0) return [];
    query = query.in("asset_id", [...opts.assetIds]);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CorporateEvent[];
}

export async function listAlertRules(supabase: ServerSupabase): Promise<AlertRule[]> {
  const { data, error } = await supabase
    .from("alert_rules")
    .select("*, asset:assets(id, symbol, name, currency)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AlertRule[];
}

export async function listNotifications(supabase: ServerSupabase, limit = 50): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function countUnreadNotifications(supabase: ServerSupabase): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

export async function listWatchlistIds(supabase: ServerSupabase): Promise<string[]> {
  const { data, error } = await supabase.from("watchlist_items").select("asset_id");
  if (error) throw error;
  return (data ?? []).map((w) => w.asset_id);
}
