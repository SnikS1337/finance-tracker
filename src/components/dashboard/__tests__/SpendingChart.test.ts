import { describe, it, expect } from "vitest";
import { prepareDisplayData } from "../spendingChartData";
import type { ChartPoint } from "../../../lib/chart-data";

function points(values: number[]): ChartPoint[] {
  return values.map((value, i) => ({ label: `Day ${i + 1}`, value }));
}

function assertFiniteGeometry(result: ReturnType<typeof prepareDisplayData>) {
  expect(Number.isFinite(result.axisMax)).toBe(true);
  expect(result.axisMax).toBeGreaterThan(0);
  for (const point of result.data) {
    expect(Number.isFinite(point.displayValue)).toBe(true);
    expect(point.displayValue).toBeGreaterThanOrEqual(0);
  }
}

describe("prepareDisplayData", () => {
  it("is a pure function: identical input always produces identical output", () => {
    const data = points([100, 200, 150, 6_000_000, 180]);
    expect(prepareDisplayData(data)).toEqual(prepareDisplayData(data));
  });

  it("has no memory between calls — simulates rapid/repeated period switching", () => {
    const yesterday = points([250_000]);
    const sevenDays = points([50_000, 120_000, 90_000, 300_000, 60_000, 70_000, 200_000]);
    const month = points([...Array(29)].map((_, i) => (i === 14 ? 6_000_000 : 80_000 + i * 1000)));

    for (const data of [yesterday, sevenDays, month, sevenDays, yesterday, month]) {
      const result = prepareDisplayData(data);
      assertFiniteGeometry(result);
      expect(result.data).toHaveLength(data.length);
    }

    expect(prepareDisplayData(yesterday)).toEqual(prepareDisplayData(yesterday));
    expect(prepareDisplayData(month)).toEqual(prepareDisplayData(month));
  });

  it("never produces NaN or Infinity for an all-zero period", () => {
    const result = prepareDisplayData(points([0, 0, 0, 0, 0]));
    assertFiniteGeometry(result);
    expect(result.data.every((p) => !p.isOutlier)).toBe(true);
  });

  it("never produces NaN or Infinity for a single data point", () => {
    const result = prepareDisplayData(points([500_000]));
    assertFiniteGeometry(result);
    expect(result.data[0].isOutlier).toBeFalsy();
  });

  it("never produces NaN or Infinity for an empty array", () => {
    const result = prepareDisplayData([]);
    assertFiniteGeometry(result);
    expect(result.data).toEqual([]);
  });

  it("flags a genuine extreme outlier without crashing", () => {
    const result = prepareDisplayData(points([80_000, 120_000, 95_000, 6_000_000, 60_000, 110_000]));
    const outliers = result.data.filter((p) => p.isOutlier);
    assertFiniteGeometry(result);
    expect(outliers).toHaveLength(1);
    expect(outliers[0].value).toBe(6_000_000);
    expect(outliers[0].outlierLabel).toContain("6");
    expect(outliers[0].displayValue).toBeLessThan(outliers[0].value);
  });

  it("does not let one outlier squash the normal bars to near-zero height", () => {
    const result = prepareDisplayData(points([80_000, 120_000, 95_000, 6_000_000, 60_000, 110_000]));
    for (const p of result.data.filter((p) => !p.isOutlier)) {
      expect(p.displayValue / result.axisMax).toBeGreaterThan(0.02);
    }
  });

  it("treats close, non-extreme values as normal", () => {
    const result = prepareDisplayData(points([100_000, 110_000, 95_000, 105_000, 98_000]));
    assertFiniteGeometry(result);
    expect(result.data.every((p) => !p.isOutlier)).toBe(true);
  });

  it("handles negative or non-finite stray inputs defensively without crashing", () => {
    const data: ChartPoint[] = [
      { label: "a", value: -50 },
      { label: "b", value: NaN },
      { label: "c", value: 100 },
    ];
    expect(() => prepareDisplayData(data)).not.toThrow();
  });
});
