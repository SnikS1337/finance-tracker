import { describe, it, expect } from "vitest";
import { fromDateKey, getComparisonRanges, getPresetRange, toDateKey, formatRangeLabel } from "../date-utils";

const keys = (r: { start: Date; end: Date }) => [toDateKey(r.start), toDateKey(r.end)];

describe("fromDateKey", () => {
  it("parses a date key as a local calendar date", () => {
    const d = fromDateKey("2026-02-28");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 1, 28, 0]);
  });

  it("rejects impossible or malformed dates", () => {
    expect(isNaN(fromDateKey("2026-02-29").getTime())).toBe(true); // 2026 isn't a leap year
    expect(isNaN(fromDateKey("2028-02-29").getTime())).toBe(false); // 2028 is
    expect(isNaN(fromDateKey("2026-13-01").getTime())).toBe(true);
    expect(isNaN(fromDateKey("26-9-1").getTime())).toBe(true);
    expect(isNaN(fromDateKey("").getTime())).toBe(true);
  });

  it("round-trips with toDateKey", () => {
    for (const key of ["2026-01-01", "2026-12-31", "2028-02-29"]) expect(toDateKey(fromDateKey(key))).toBe(key);
  });
});

describe("getPresetRange edge cases", () => {
  it("'last month' in January is December of the previous year", () => {
    expect(keys(getPresetRange("lastMonth", undefined, undefined, new Date(2026, 0, 15)))).toEqual([
      "2025-12-01",
      "2025-12-31",
    ]);
  });

  it("weeks start on Monday", () => {
    // Sunday 27 Sep 2026 belongs to the week of Monday 21 Sep.
    expect(keys(getPresetRange("thisWeek", undefined, undefined, new Date(2026, 8, 27)))).toEqual([
      "2026-09-21",
      "2026-09-27",
    ]);
    expect(keys(getPresetRange("lastWeek", undefined, undefined, new Date(2026, 8, 27)))).toEqual([
      "2026-09-14",
      "2026-09-20",
    ]);
  });

  it("'7 days' includes today and the six days before", () => {
    expect(keys(getPresetRange("7d", undefined, undefined, new Date(2026, 8, 3)))).toEqual(["2026-08-28", "2026-09-03"]);
  });

  it("'yesterday' crosses a year boundary", () => {
    expect(keys(getPresetRange("yesterday", undefined, undefined, new Date(2026, 0, 1)))).toEqual([
      "2025-12-31",
      "2025-12-31",
    ]);
  });

  it("custom range uses the given keys", () => {
    expect(keys(getPresetRange("custom", "2026-09-10", "2026-09-12"))).toEqual(["2026-09-10", "2026-09-12"]);
  });
});

describe("getComparisonRanges edge cases", () => {
  it("a running March 30th compares with February without spilling into March", () => {
    const march = { start: new Date(2028, 2, 1), end: new Date(2028, 2, 31) };
    const c = getComparisonRanges(march, new Date(2028, 2, 30))!;
    expect(keys(c.previous)).toEqual(["2028-02-01", "2028-02-29"]);
  });

  it("a period that hasn't started compares just its first day", () => {
    const next = { start: new Date(2026, 9, 1), end: new Date(2026, 9, 31) };
    const c = getComparisonRanges(next, new Date(2026, 8, 24))!;
    expect(keys(c.current)).toEqual(["2026-10-01", "2026-10-01"]);
  });
});

describe("formatRangeLabel", () => {
  it("shows a placeholder for an invalid range instead of 'Invalid Date'", () => {
    const label = formatRangeLabel({ start: new Date(NaN), end: new Date(NaN) });
    expect(label.includes("Invalid")).toBe(false);
  });
});
