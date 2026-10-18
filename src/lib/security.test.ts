import { describe, expect, it } from "vitest";

import { safeRedirectPath, timingSafeEqual } from "./security";

describe("safeRedirectPath", () => {
  it.each([
    ["/portfolio", "/portfolio"],
    ["/assets/1?tab=news", "/assets/1?tab=news"],
    ["//evil.com", "/dashboard"],
    ["https://evil.com", "/dashboard"],
    ["/\\evil.com", "/dashboard"],
    ["", "/dashboard"],
    [undefined, "/dashboard"],
  ])("%s → %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});

describe("timingSafeEqual", () => {
  it("compares strings", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });
});
