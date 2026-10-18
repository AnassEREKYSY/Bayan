import "server-only";

import {
  valueHistory,
  valuePortfolio,
  type PortfolioSummary,
  type Position,
  type TransactionInput,
} from "@/domain/portfolio";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

import { getAssetsByIds, getFx, getPriceHistory, getQuotes, toAssetInfo, type Asset } from "./market";

export type Portfolio = Tables<"portfolios">;
export type Transaction = Tables<"transactions">;
export type TransactionWithAsset = Transaction & { asset: Asset };

export async function listPortfolios(supabase: ServerSupabase): Promise<Portfolio[]> {
  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

/** Resolve the portfolio to show: the requested one if it belongs to the user, else the default. */
export function pickPortfolio(portfolios: Portfolio[], requested?: string | null): Portfolio | null {
  return (
    portfolios.find((p) => p.id === requested) ??
    portfolios.find((p) => p.is_default) ??
    portfolios[0] ??
    null
  );
}

export async function listTransactions(
  supabase: ServerSupabase,
  opts: { portfolioId?: string; assetId?: string; limit?: number } = {},
): Promise<TransactionWithAsset[]> {
  let query = supabase
    .from("transactions")
    .select("*, asset:assets(*)")
    .order("executed_at", { ascending: false })
    .limit(opts.limit ?? 1000);
  if (opts.portfolioId) query = query.eq("portfolio_id", opts.portfolioId);
  if (opts.assetId) query = query.eq("asset_id", opts.assetId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as TransactionWithAsset[];
}

export const toTransactionInput = (t: Transaction): TransactionInput => ({
  assetId: t.asset_id,
  type: t.type,
  quantity: Number(t.quantity),
  price: Number(t.price),
  fees: Number(t.fees),
  amount: Number(t.amount),
  executedAt: t.executed_at,
});

export interface PortfolioView {
  positions: Position[];
  summary: PortfolioSummary;
  pricesAsOf: string | null;
  fxAsOf: string | null;
}

/** Loads everything needed to value a set of transactions in the base currency. */
export async function buildPortfolioView(
  supabase: ServerSupabase,
  transactions: readonly Transaction[],
  baseCurrency: string,
): Promise<PortfolioView> {
  const assetIds = [...new Set(transactions.map((t) => t.asset_id))];
  const [assets, quotes, { fx, asOf: fxAsOf }] = await Promise.all([
    getAssetsByIds(supabase, assetIds),
    getQuotes(supabase, assetIds),
    getFx(supabase),
  ]);

  const { positions, summary } = valuePortfolio({
    transactions: transactions.map(toTransactionInput),
    assets: new Map([...assets.values()].map((a) => [a.id, toAssetInfo(a)])),
    quotes,
    fx,
    baseCurrency,
  });

  let pricesAsOf: string | null = null;
  for (const q of quotes.values()) if (!pricesAsOf || q.asOf > pricesAsOf) pricesAsOf = q.asOf;

  return { positions, summary, pricesAsOf, fxAsOf };
}

export async function buildValueHistory(
  supabase: ServerSupabase,
  transactions: readonly Transaction[],
  baseCurrency: string,
  days: number,
) {
  const assetIds = [...new Set(transactions.map((t) => t.asset_id))];
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  const from = start.toISOString().slice(0, 10);

  const [assets, prices, { fx }] = await Promise.all([
    getAssetsByIds(supabase, assetIds),
    getPriceHistory(supabase, assetIds, from),
    getFx(supabase),
  ]);

  const dates: string[] = [];
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }

  return valueHistory({
    transactions: transactions.map(toTransactionInput),
    assets: new Map([...assets.values()].map((a) => [a.id, toAssetInfo(a)])),
    prices,
    fx,
    baseCurrency,
    dates,
  });
}
