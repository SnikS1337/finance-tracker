import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BarShapeProps } from "recharts";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { formatCurrency } from "../../lib/currency";
import type { ChartPoint } from "../../lib/chart-data";
import { t } from "../../i18n";

const CHART_TRANSITION_MS = 420;
const OUTLIER_RATIO = 8;

type DisplayPoint = ChartPoint & {
  displayValue: number;
  isOutlier?: boolean;
  outlierLabel?: string;
};

function getNiceAxisMaxValue(maxValue: number) {
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

function formatCompactValue(value: number) {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млрд`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млн`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} тыс`;
  }

  return String(Math.round(value));
}

function getOutlierBaseline(values: number[]) {
  const positiveValues = values.filter((value) => value > 0).sort((a, b) => a - b);

  if (positiveValues.length === 0) return 0;
  if (positiveValues.length < 3) return positiveValues[0];

  const middle = Math.floor(positiveValues.length / 2);

  return positiveValues.length % 2 === 0
    ? (positiveValues[middle - 1] + positiveValues[middle]) / 2
    : positiveValues[middle];
}

function prepareDisplayData(data: ChartPoint[]): {
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
    .map((point) => point.value);

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

function getAxisTicks(max: number) {
  return [0, max * 0.25, max * 0.5, max * 0.75, max];
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload as DisplayPoint;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      <p className="font-medium">{label}</p>
      <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">
        {formatCurrency(point.value)}
      </p>
    </div>
  );
}

function SpendingBarShape(props: BarShapeProps) {
  const {
    x,
    y,
    width,
    height,
    fill,
    payload,
  } = props;

  if (x == null || y == null || width == null || height == null) return null;

  const left = Number(x);
  const top = Number(y);
  const barWidth = Number(width);
  const barHeight = Number(height);

  if (![left, top, barWidth, barHeight].every(Number.isFinite)) return null;

  const point = payload as DisplayPoint | undefined;

  if (barHeight === 0) {
    return (
      <rect
        x={left}
        y={top}
        width={barWidth}
        height={0}
        fill={fill}
      />
    );
  }

  const bottom = top + barHeight;

  if (!point?.isOutlier) {
    return (
      <rect
        x={left}
        y={top}
        width={barWidth}
        height={barHeight}
        rx={4}
        ry={4}
        fill={fill}
      />
    );
  }

  const breakHeight = Math.min(7, Math.max(4, barWidth * 0.18));
  const breakY = top + breakHeight;

  return (
    <g>
      <rect
        x={left}
        y={breakY + 3}
        width={barWidth}
        height={Math.max(0, bottom - breakY - 3)}
        rx={4}
        ry={4}
        fill={fill}
      />
      <path
        d={`M ${left - 1} ${breakY + 1} L ${left + barWidth * 0.35} ${breakY + breakHeight} L ${left + barWidth * 0.65} ${breakY} L ${left + barWidth + 1} ${breakY + breakHeight - 1}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x={left + barWidth / 2}
        y={Math.max(12, top - 7)}
        textAnchor="middle"
        fill="currentColor"
        fontSize={10}
        fontWeight={500}
      >
        {point.outlierLabel}
      </text>
    </g>
  );
}

function ChartCanvas({
  data,
  axisMax,
}: {
  data: DisplayPoint[];
  axisMax: number;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 4, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "currentColor" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, axisMax]}
          ticks={getAxisTicks(axisMax)}
          allowDataOverflow
          tick={{ fontSize: 11, fill: "currentColor" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) =>
            v >= 1_000_000
              ? `${v / 1_000_000} млн`
              : v >= 1000
                ? `${v / 1000} тыс`
                : String(Math.round(v))
          }
          width={72}
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: "currentColor", opacity: 0.06 }}
          isAnimationActive={false}
          animationDuration={0}
        />
        <Bar
          dataKey="displayValue"
          fill="#0ea5e9"
          maxBarSize={28}
          shape={SpendingBarShape}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SpendingChart({ data }: { data: ChartPoint[] }) {
  const prepared = prepareDisplayData(data);

  if (data.length === 0) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-semibold">{t.chart.spendingOverTime}</h3>
        <EmptyState title={t.chart.notEnoughData} description={t.chart.notEnoughDataHint} />
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold">{t.chart.spendingOverTime}</h3>
      <div className="h-56 w-full">
        <ChartCanvas data={prepared.data} axisMax={prepared.axisMax} />
      </div>
    </Card>
  );
}
