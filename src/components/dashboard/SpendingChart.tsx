import { useEffect, useState } from "react";
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, matchByDataKey } from "recharts";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { formatCurrency } from "../../lib/currency";
import type { ChartPoint } from "../../lib/chart-data";
import { t } from "../../i18n";

const CHART_TRANSITION_MS = 420;
const OUTLIER_RATIO = 8;

type DisplayPoint = ChartPoint & {
  displayValue: number;
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

function prepareDisplayData(data: ChartPoint[]): {
  data: DisplayPoint[];
  axisMax: number;
} {
  const values = data.map((point) => point.value).sort((a, b) => b - a);
  const maxValue = values[0] ?? 0;
  const secondMaxValue = values[1] ?? 0;
  const hasOutlier =
    values.length > 1 &&
    secondMaxValue > 0 &&
    maxValue >= secondMaxValue * OUTLIER_RATIO;

  const normalMax = hasOutlier ? secondMaxValue : maxValue;
  const axisMax = getNiceAxisMaxValue(normalMax);

  return {
    axisMax,
    data: data.map((point) => {
      const isOutlier = hasOutlier && point.value === maxValue;

      return {
        ...point,
        displayValue: isOutlier ? axisMax : point.value,
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

function ChartCanvas({
  data,
  axisMax,
}: {
  data: DisplayPoint[];
  axisMax: number;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          isAnimationActive
          animationDuration={CHART_TRANSITION_MS}
          animationEasing="ease-out"
          animationMatchBy={matchByDataKey("label")}
        >
          <LabelList
            dataKey="outlierLabel"
            position="top"
            fill="currentColor"
            fontSize={10}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SpendingChart({ data }: { data: ChartPoint[] }) {
  const dataKey = data.map(({ label, value }) => `${label}:${value}`).join("|");
  const prepared = prepareDisplayData(data);
  const [displayedData, setDisplayedData] = useState(prepared.data);
  const [displayedKey, setDisplayedKey] = useState(dataKey);
  const [axisMax, setAxisMax] = useState(prepared.axisMax);

  useEffect(() => {
    if (dataKey === displayedKey) return;

    setDisplayedData(prepared.data);
    setDisplayedKey(dataKey);
    setAxisMax((currentMax) => Math.max(currentMax, prepared.axisMax));

    const timer = window.setTimeout(() => {
      setAxisMax(prepared.axisMax);
    }, CHART_TRANSITION_MS);

    return () => window.clearTimeout(timer);
  }, [data, dataKey, displayedKey, prepared]);

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
        <ChartCanvas data={displayedData} axisMax={axisMax} />
      </div>
    </Card>
  );
}
