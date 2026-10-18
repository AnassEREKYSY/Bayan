import { describe, expect, it } from "vitest";

import { convert, MissingFxRateError } from "./money";
import {
  allocation,
  buildLedgers,
  findOversell,
  valueHistory,
  valuePortfolio,
  type AssetInfo,
  type TransactionInput,
} from "./portfolio";

const tx = (p: Partial<TransactionInput> & Pick<TransactionInput, "type">): TransactionInput => ({
  assetId: "a",
  quantity: 0,
  price: 0,
  fees: 0,
  amount: 0,
  executedAt: "2026-01-01T10:00:00Z",
  ...p,
});

const assets = new Map<string, AssetInfo>([
  ["a", { id: "a", symbol: "MSA", name: "Marsa Maroc", currency: "MAD", assetClass: "stock", market: "casablanca" }],
  ["b", { id: "b", symbol: "AAPL", name: "Apple", currency: "USD", assetClass: "stock", market: "us" }],
]);
const fx = { USD: 1, MAD: 10, EUR: 0.9 };

describe("convert", () => {
  it("converts through USD", () => {
    expect(convert(100, "USD", "MAD", fx)).toBeCloseTo(1000);
    expect(convert(1000, "MAD", "EUR", fx)).toBeCloseTo(90);
  });
  it("throws on a missing rate", () => {
    expect(() => convert(1, "GBP", "USD", fx)).toThrow(MissingFxRateError);
  });
});

describe("buildLedgers", () => {
  it("uses weighted average cost and realises P&L on sells", () => {
    const l = buildLedgers([
      tx({ type: "buy", quantity: 2, price: 100, fees: 2, executedAt: "2026-01-01T00:00:00Z" }),
      tx({ type: "buy", quantity: 2, price: 120, executedAt: "2026-01-02T00:00:00Z" }),
      tx({ type: "sell", quantity: 1, price: 150, fees: 1, executedAt: "2026-01-03T00:00:00Z" }),
    ]).get("a")!;
    // cost 442 for 4 → avg 110.5; sell 1 at 150 − 1 fee → realised 38.5
    expect(l.quantity).toBe(3);
    expect(l.costBasis).toBeCloseTo(331.5);
    expect(l.realizedPnl).toBeCloseTo(38.5);
  });

  it("closes a position cleanly and tracks dividends and fees", () => {
    const l = buildLedgers([
      tx({ type: "buy", quantity: 1, price: 50 }),
      tx({ type: "dividend", amount: 5, executedAt: "2026-02-01T00:00:00Z" }),
      tx({ type: "fee", amount: 2, executedAt: "2026-02-02T00:00:00Z" }),
      tx({ type: "sell", quantity: 1, price: 60, executedAt: "2026-03-01T00:00:00Z" }),
    ]).get("a")!;
    expect(l.quantity).toBe(0);
    expect(l.costBasis).toBe(0);
    expect(l.dividends).toBe(5);
    expect(l.realizedPnl).toBeCloseTo(8);
  });

  it("replays in date order regardless of input order", () => {
    const l = buildLedgers([
      tx({ type: "sell", quantity: 1, price: 20, executedAt: "2026-01-05T00:00:00Z" }),
      tx({ type: "buy", quantity: 1, price: 10, executedAt: "2026-01-01T00:00:00Z" }),
    ]).get("a")!;
    expect(l.realizedPnl).toBeCloseTo(10);
  });
});

describe("findOversell", () => {
  it("detects selling more than held at that date", () => {
    expect(
      findOversell([
        tx({ type: "buy", quantity: 1, executedAt: "2026-01-02T00:00:00Z" }),
        tx({ type: "sell", quantity: 1, executedAt: "2026-01-01T00:00:00Z" }),
      ]),
    ).toBe("a");
  });
  it("accepts a valid history", () => {
    expect(
      findOversell([tx({ type: "buy", quantity: 2 }), tx({ type: "sell", quantity: 2, executedAt: "2026-02-01T00:00:00Z" })]),
    ).toBeNull();
  });
});

describe("valuePortfolio", () => {
  const transactions = [
    tx({ assetId: "a", type: "buy", quantity: 10, price: 100 }),
    tx({ assetId: "b", type: "buy", quantity: 1, price: 150 }),
  ];
  const quotes = new Map([
    ["a", { price: 110, previousClose: 100 }],
    ["b", { price: 200, previousClose: 190 }],
  ]);

  it("aggregates in the base currency", () => {
    const { summary, positions } = valuePortfolio({ transactions, assets, quotes, fx, baseCurrency: "MAD" });
    expect(summary.marketValue).toBeCloseTo(1100 + 2000);
    expect(summary.costBasis).toBeCloseTo(1000 + 1500);
    expect(summary.unrealizedPnl).toBeCloseTo(100 + 500);
    expect(summary.dayChange).toBeCloseTo(100 + 100);
    expect(positions[0]!.asset.symbol).toBe("AAPL");
    expect(positions.reduce((s, p) => s + (p.weight ?? 0), 0)).toBeCloseTo(1);
  });

  it("reports positions without a price instead of valuing them at zero", () => {
    const { summary } = valuePortfolio({
      transactions,
      assets,
      quotes: new Map([["a", { price: 110, previousClose: null }]]),
      fx,
      baseCurrency: "MAD",
    });
    expect(summary.missingPrices).toBe(1);
    expect(summary.marketValue).toBeCloseTo(1100);
    expect(summary.unrealizedPct).toBeCloseTo(0.1);
  });

  it("builds an allocation that sums to 100 %", () => {
    const { positions } = valuePortfolio({ transactions, assets, quotes, fx, baseCurrency: "MAD" });
    const slices = allocation(positions, (p) => p.asset.market);
    expect(slices.map((s) => s.key)).toEqual(["us", "casablanca"]);
    expect(slices.reduce((s, x) => s + x.weight, 0)).toBeCloseTo(1);
  });
});

describe("valueHistory", () => {
  it("values holdings with the last known close of each day", () => {
    const series = valueHistory({
      transactions: [tx({ type: "buy", quantity: 2, price: 10, executedAt: "2026-01-02T09:00:00Z" })],
      assets,
      prices: new Map([
        [
          "a",
          [
            { date: "2026-01-01", close: 9 },
            { date: "2026-01-02", close: 10 },
            { date: "2026-01-04", close: 12 },
          ],
        ],
      ]),
      fx,
      baseCurrency: "MAD",
      dates: ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"],
    });
    expect(series.map((p) => p.value)).toEqual([0, 20, 20, 24]);
  });
});
