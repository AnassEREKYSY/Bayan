import { describe, expect, it } from "vitest";

import { catalogQuerySchema, fromGecko, fromTwelve, importSchema, keywordsFor } from "./catalog";

const twelve = (over: Record<string, unknown> = {}) => ({
  symbol: "AAPL",
  instrument_name: "Apple Inc.",
  exchange: "NASDAQ",
  mic_code: "XNGS",
  instrument_type: "Common Stock",
  country: "United States",
  currency: "USD",
  access: { global: "Basic", plan: "Basic" },
  ...over,
});

describe("fromTwelve", () => {
  it("maps a US stock", () => {
    expect(fromTwelve(twelve(), true)).toEqual({
      provider: "twelvedata",
      ref: "AAPL|XNGS",
      symbol: "AAPL",
      name: "Apple Inc.",
      market: "us",
      assetClass: "stock",
      currency: "USD",
      exchange: "NASDAQ",
    });
  });

  it("maps a European ETF", () => {
    const hit = fromTwelve(
      twelve({ symbol: "CW8", instrument_name: "Amundi MSCI World", exchange: "Euronext", mic_code: "XPAR", instrument_type: "ETF", country: "France", currency: "EUR" }),
      true,
    );
    expect(hit).toMatchObject({ market: "europe", assetClass: "etf", ref: "CW8|XPAR", currency: "EUR" });
  });

  it("skips what the free plan can't price, OTC listings and other countries", () => {
    expect(fromTwelve(twelve({ access: { global: "Grow" } }), true)).toBeNull();
    expect(fromTwelve(twelve({ access: { global: "Grow" } }), false)).not.toBeNull();
    expect(fromTwelve(twelve({ exchange: "OTC" }), true)).toBeNull();
    expect(fromTwelve(twelve({ country: "Japan" }), true)).toBeNull();
    expect(fromTwelve(twelve({ instrument_type: "Mutual Fund" }), true)).toBeNull();
  });

  it("rejects malformed rows", () => {
    expect(fromTwelve({ symbol: "X" }, true)).toBeNull();
    expect(fromTwelve(twelve({ mic_code: "bad" }), true)).toBeNull();
  });
});

describe("fromGecko", () => {
  it("maps a coin to a USD crypto asset", () => {
    expect(fromGecko({ id: "cardano", name: "Cardano", symbol: "ada", market_cap_rank: 9 })).toMatchObject({
      provider: "coingecko",
      ref: "cardano",
      symbol: "ADA",
      market: "crypto",
      currency: "USD",
    });
  });
});

describe("importSchema", () => {
  it("accepts well-formed references only", () => {
    expect(importSchema.safeParse({ provider: "twelvedata", ref: "AAPL|XNGS" }).success).toBe(true);
    expect(importSchema.safeParse({ provider: "coingecko", ref: "bitcoin" }).success).toBe(true);
    expect(importSchema.safeParse({ provider: "twelvedata", ref: "AAPL" }).success).toBe(false);
    expect(importSchema.safeParse({ provider: "coingecko", ref: "../admin" }).success).toBe(false);
    expect(importSchema.safeParse({ provider: "other", ref: "x" }).success).toBe(false);
  });
});

describe("catalogQuerySchema", () => {
  it("keeps plain names and symbols", () => {
    expect(catalogQuerySchema.safeParse("Air Liquide").success).toBe(true);
    expect(catalogQuerySchema.safeParse("l'oréal").success).toBe(true);
    expect(catalogQuerySchema.safeParse("a").success).toBe(false);
    expect(catalogQuerySchema.safeParse("x&y=1;drop").success).toBe(false);
  });
});

describe("keywordsFor", () => {
  it("drops legal suffixes", () => {
    expect(keywordsFor(fromTwelve(twelve(), true)!)).toEqual(["apple"]);
  });
});
