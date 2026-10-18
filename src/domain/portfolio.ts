import { tryConvert, type FxTable } from "./money";

/**
 * Portfolio maths. Pure functions, no I/O — fully unit-tested.
 *
 * Method: weighted average cost. Amounts of a position are kept in the
 * asset's own currency and converted to the user's base currency only when
 * aggregating, using the latest FX rates.
 */

const EPSILON = 1e-10;

export type TransactionType = "buy" | "sell" | "dividend" | "fee";

export interface TransactionInput {
  assetId: string;
  type: TransactionType;
  quantity: number;
  price: number;
  fees: number;
  amount: number;
  executedAt: string; // ISO timestamp
}

export interface AssetInfo {
  id: string;
  symbol: string;
  name: string;
  currency: string;
  assetClass: string;
  market: string;
}

export interface Quote {
  price: number;
  previousClose: number | null;
}

export interface PositionLedger {
  assetId: string;
  quantity: number;
  costBasis: number;
  realizedPnl: number;
  dividends: number;
}

export interface Position extends PositionLedger {
  asset: AssetInfo;
  averageCost: number;
  price: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPct: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  /** Same figures converted to the base currency (null when a rate is missing). */
  base: {
    marketValue: number | null;
    costBasis: number | null;
    unrealizedPnl: number | null;
    realizedPnl: number | null;
    dividends: number | null;
    dayChange: number | null;
  };
  weight: number | null; // share of total base market value
}

export interface PortfolioSummary {
  baseCurrency: string;
  marketValue: number;
  costBasis: number;
  unrealizedPnl: number;
  unrealizedPct: number | null;
  realizedPnl: number;
  dividends: number;
  dayChange: number;
  dayChangePct: number | null;
  positionsCount: number;
  missingPrices: number;
}

export interface AllocationSlice {
  key: string;
  value: number;
  weight: number;
}

const byDate = (a: TransactionInput, b: TransactionInput) =>
  a.executedAt < b.executedAt ? -1 : a.executedAt > b.executedAt ? 1 : 0;

/** Replays transactions into one ledger per asset. */
export function buildLedgers(transactions: readonly TransactionInput[]): Map<string, PositionLedger> {
  const ledgers = new Map<string, PositionLedger>();

  for (const tx of [...transactions].sort(byDate)) {
    const l = ledgers.get(tx.assetId) ?? {
      assetId: tx.assetId,
      quantity: 0,
      costBasis: 0,
      realizedPnl: 0,
      dividends: 0,
    };

    switch (tx.type) {
      case "buy": {
        l.quantity += tx.quantity;
        l.costBasis += tx.quantity * tx.price + tx.fees;
        break;
      }
      case "sell": {
        const sold = Math.min(tx.quantity, l.quantity);
        const avg = l.quantity > EPSILON ? l.costBasis / l.quantity : 0;
        l.realizedPnl += sold * tx.price - tx.fees - avg * sold;
        l.costBasis -= avg * sold;
        l.quantity -= sold;
        if (l.quantity < EPSILON) {
          l.quantity = 0;
          l.costBasis = 0;
        }
        break;
      }
      case "dividend": {
        l.dividends += tx.amount;
        break;
      }
      case "fee": {
        l.realizedPnl -= tx.amount;
        break;
      }
    }

    ledgers.set(tx.assetId, l);
  }

  return ledgers;
}

/**
 * Returns the first asset whose held quantity would go negative when the
 * transactions are replayed in date order, or null when the history is valid.
 */
export function findOversell(transactions: readonly TransactionInput[]): string | null {
  const held = new Map<string, number>();
  for (const tx of [...transactions].sort(byDate)) {
    const q = held.get(tx.assetId) ?? 0;
    if (tx.type === "buy") held.set(tx.assetId, q + tx.quantity);
    if (tx.type === "sell") {
      if (tx.quantity - q > EPSILON) return tx.assetId;
      held.set(tx.assetId, q - tx.quantity);
    }
  }
  return null;
}

export function valuePortfolio(params: {
  transactions: readonly TransactionInput[];
  assets: ReadonlyMap<string, AssetInfo>;
  quotes: ReadonlyMap<string, Quote>;
  fx: FxTable;
  baseCurrency: string;
  includeClosed?: boolean;
}): { positions: Position[]; summary: PortfolioSummary } {
  const { transactions, assets, quotes, fx, baseCurrency, includeClosed = false } = params;
  const ledgers = buildLedgers(transactions);
  const positions: Position[] = [];

  const toBase = (v: number | null, currency: string) =>
    v == null ? null : tryConvert(v, currency, baseCurrency, fx);

  for (const ledger of ledgers.values()) {
    const asset = assets.get(ledger.assetId);
    if (!asset) continue;
    const open = ledger.quantity > EPSILON;
    if (!open && !includeClosed) continue;

    const quote = quotes.get(ledger.assetId);
    const price = quote?.price ?? null;
    const marketValue = price != null ? ledger.quantity * price : null;
    const unrealizedPnl = marketValue != null ? marketValue - ledger.costBasis : null;
    const unrealizedPct =
      unrealizedPnl != null && ledger.costBasis > EPSILON ? unrealizedPnl / ledger.costBasis : null;
    const prev = quote?.previousClose ?? null;
    const dayChange = price != null && prev != null ? ledger.quantity * (price - prev) : null;
    const dayChangePct = price != null && prev != null && prev > 0 ? (price - prev) / prev : null;

    positions.push({
      ...ledger,
      asset,
      averageCost: open ? ledger.costBasis / ledger.quantity : 0,
      price,
      marketValue,
      unrealizedPnl,
      unrealizedPct,
      dayChange,
      dayChangePct,
      base: {
        marketValue: toBase(marketValue, asset.currency),
        costBasis: toBase(ledger.costBasis, asset.currency),
        unrealizedPnl: toBase(unrealizedPnl, asset.currency),
        realizedPnl: toBase(ledger.realizedPnl, asset.currency),
        dividends: toBase(ledger.dividends, asset.currency),
        dayChange: toBase(dayChange, asset.currency),
      },
      weight: null,
    });
  }

  const sum = (pick: (p: Position) => number | null) =>
    positions.reduce((acc, p) => acc + (pick(p) ?? 0), 0);

  const marketValue = sum((p) => p.base.marketValue);
  const costBasisOfPriced = sum((p) => (p.base.marketValue != null ? p.base.costBasis : 0));
  const unrealizedPnl = sum((p) => p.base.unrealizedPnl);
  const dayChange = sum((p) => p.base.dayChange);
  const previousValue = marketValue - dayChange;

  for (const p of positions) {
    p.weight = p.base.marketValue != null && marketValue > 0 ? p.base.marketValue / marketValue : null;
  }
  positions.sort((a, b) => (b.base.marketValue ?? -1) - (a.base.marketValue ?? -1));

  return {
    positions,
    summary: {
      baseCurrency,
      marketValue,
      costBasis: sum((p) => p.base.costBasis),
      unrealizedPnl,
      unrealizedPct: costBasisOfPriced > EPSILON ? unrealizedPnl / costBasisOfPriced : null,
      realizedPnl: sum((p) => p.base.realizedPnl),
      dividends: sum((p) => p.base.dividends),
      dayChange,
      dayChangePct: previousValue > EPSILON ? dayChange / previousValue : null,
      positionsCount: positions.filter((p) => p.quantity > EPSILON).length,
      missingPrices: positions.filter((p) => p.quantity > EPSILON && p.price == null).length,
    },
  };
}

/** Groups open positions by a key (asset class, market…) using base market value. */
export function allocation(positions: readonly Position[], keyOf: (p: Position) => string): AllocationSlice[] {
  const totals = new Map<string, number>();
  for (const p of positions) {
    if (p.base.marketValue == null || p.base.marketValue <= 0) continue;
    const key = keyOf(p);
    totals.set(key, (totals.get(key) ?? 0) + p.base.marketValue);
  }
  const total = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .map(([key, value]) => ({ key, value, weight: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.value - a.value);
}

export interface PricePoint {
  date: string; // YYYY-MM-DD
  close: number;
}

/**
 * Daily portfolio value in the base currency, replaying holdings day by day
 * against historical closes. FX uses the latest rates (documented limitation).
 */
export function valueHistory(params: {
  transactions: readonly TransactionInput[];
  assets: ReadonlyMap<string, AssetInfo>;
  prices: ReadonlyMap<string, readonly PricePoint[]>; // ascending by date
  fx: FxTable;
  baseCurrency: string;
  dates: readonly string[]; // ascending YYYY-MM-DD
}): { date: string; value: number }[] {
  const { transactions, assets, prices, fx, baseCurrency, dates } = params;
  const sorted = [...transactions].sort(byDate);
  const qty = new Map<string, number>();
  const cursor = new Map<string, number>();
  let txIndex = 0;

  return dates.map((date) => {
    while (txIndex < sorted.length && sorted[txIndex]!.executedAt.slice(0, 10) <= date) {
      const tx = sorted[txIndex]!;
      const q = qty.get(tx.assetId) ?? 0;
      if (tx.type === "buy") qty.set(tx.assetId, q + tx.quantity);
      if (tx.type === "sell") qty.set(tx.assetId, Math.max(0, q - tx.quantity));
      txIndex++;
    }

    let value = 0;
    for (const [assetId, q] of qty) {
      if (q <= EPSILON) continue;
      const series = prices.get(assetId);
      const asset = assets.get(assetId);
      if (!series || !asset) continue;
      let i = cursor.get(assetId) ?? -1;
      while (i + 1 < series.length && series[i + 1]!.date <= date) i++;
      cursor.set(assetId, i);
      if (i < 0) continue;
      const converted = tryConvert(q * series[i]!.close, asset.currency, baseCurrency, fx);
      if (converted != null) value += converted;
    }
    return { date, value };
  });
}
