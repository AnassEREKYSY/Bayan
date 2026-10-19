import { describe, expect, it } from "vitest";

import { parsePriceRows } from "./price-import";

const TODAY = "2026-10-19";

describe("parsePriceRows", () => {
  it("reads ISO and French formats, sorted by date", () => {
    const { points, badLines } = parsePriceRows(
      ["Date;Cours", "16/10/2026;712,50", "2026-10-15,705.1", "14/10/2026\t1 698,00"].join("\n"),
      TODAY,
    );
    expect(badLines).toEqual([]);
    expect(points).toEqual([
      { date: "2026-10-14", close: 1698 },
      { date: "2026-10-15", close: 705.1 },
      { date: "2026-10-16", close: 712.5 },
    ]);
  });

  it("handles thousands separators both ways", () => {
    const { points } = parsePriceRows("2026-10-16;1.712,50\n2026-10-15,\"x\"\n2026-10-14 1,700.25", TODAY);
    expect(points.map((p) => p.close)).toEqual([1700.25, 1712.5]);
  });

  it("keeps the last value for a repeated day", () => {
    const { points } = parsePriceRows("2026-10-16,10\n2026-10-16,11", TODAY);
    expect(points).toEqual([{ date: "2026-10-16", close: 11 }]);
  });

  it("reports bad lines: impossible dates, future dates, zero or missing prices", () => {
    const { points, badLines } = parsePriceRows(
      ["2026-10-16,10", "31/02/2026;12", "2026-12-01,10", "2026-10-15,0", "2026-10-14", "", "hello"].join("\n"),
      TODAY,
    );
    expect(points).toHaveLength(1);
    expect(badLines).toEqual([2, 3, 4, 5, 7]);
  });
});
