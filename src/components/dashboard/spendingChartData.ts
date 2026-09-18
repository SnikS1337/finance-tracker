import type { ChartPoint } from "../../lib/chart-data";

export const OUTLIER_RATIO = 8;

export type DisplayPoint = ChartPoint & {
  displayValue: number;
  isOutlier?: boolean;
  outlierLabel?: string;
};

export function getNiceAxisMaxValue(maxValue: number) {
  if (maxValue === 0) return 1000;

  const power = 10 ** Math.floor(Math.log10(maxValue));
  const normalized = maxValue / power;
  const niceNormalized =
    normalized <= 1 ? 1 :
    normalized <= 2 ? 2 :
    normalized <= 2.5 ? 2.5 :
    normalized <= 5 ? 5 :
    10;

  return niceNormalized * power;
}

export function formatCompactValue(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млрд`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млн`;
  if (value >= 1000) return `${(value / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} тыс`;
  return String(Math.round(value));
}

export function getOutlierBaseline(values: number[]) {
  const positiveValues = values
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  if (positiveValues.length === 0) return 0;
  if (positiveValues.length < 3) return positiveValues[0];

  const middle = Math.floor(positiveValues.length / 2);

  return positiveValues.length % 2 === 0
    ? (positiveValues[middle - 1] + positiveValues[middle]) / 2
    : positiveValues[middle];
}

export function prepareDisplayData(data: ChartPoint[]): {
  data: DisplayPoint[];
  axisMax: number;
} {
  const values = data.map((point) => point.value);
  const baseline = getOutlierBaseline(values);
  const hasOutliers = baseline > 0;

  const outlierFlags = data.map(
    (point) => hasOutliers && point.value >= baseline * OUTLIER_RATIO,
  );

  const normalValues = data
    .filter((_, index) => !outlierFlags[index])
    .map((point) => point.value)
    .filter((value) => Number.isFinite(value));

  const normalMax = Math.max(0, ...normalValues);
  const axisMax = getNiceAxisMaxValue(normalMax);

  return {
    axisMax,
    data: data.map((point, index) => {
      const isOutlier = outlierFlags[index];

      return {
        ...point,
        displayValue: isOutlier ? axisMax * 0.9 : point.value,
        isOutlier,
        outlierLabel: isOutlier ? `↗ ${formatCompactValue(point.value)}` : undefined,
      };
    }),
  };
}

export function getAxisTicks(max: number) {
  return [0, max * 0.25, max * 0.5, max * 0.75, max];
}
