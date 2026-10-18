import { describe, expect, it } from "vitest";

import { normaliseNumber, summaryNumbersSupported } from "./summary-guard";

describe("normaliseNumber", () => {
  it.each([
    ["1 234,50", "1234.5"],
    ["1,234.50", "1234.5"],
    ["12,5", "12.5"],
    ["1.234", "1234"],
    ["2026", "2026"],
  ])("%s → %s", (input, expected) => {
    expect(normaliseNumber(input)).toBe(expected);
  });
});

describe("summaryNumbersSupported", () => {
  const source = "Le chiffre d'affaires atteint 1 234,5 MDH en 2026, en hausse de 12,5 %.";

  it("accepts a summary whose figures come from the source", () => {
    expect(summaryNumbersSupported("Revenue reached 1,234.5 MDH in 2026 (+12.5%).", source)).toBe(true);
  });

  it("rejects a summary with an invented figure", () => {
    expect(summaryNumbersSupported("Revenue grew 15% in 2026.", source)).toBe(false);
  });
});
