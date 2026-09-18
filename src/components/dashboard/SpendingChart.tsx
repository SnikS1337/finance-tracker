import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, matchByDataKey } from "recharts";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { formatCurrency } from "../../lib/currency";
import type { ChartPoint } from "../../lib/chart-data";
import { t } from "../../i18n";

const CHART_TRANSITION_MS = 420;

function getNiceAxisMax(data: ChartPoint[]) {
  const maxValue = Math.max(0, ...data.map((point) => point.value));

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

function getAxisTicks(max: number) {
  return [0, max * 0.25, max * 0.5, max * 0.75, max];
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      <p className="font-medium">{label}</p>
      <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

function ChartCanvas({
  data,
  tooltipDisabled,
  axisMax,
}: {
  data: ChartPoint[];
  tooltipDisabled: boolean;
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
          active={tooltipDisabled ? false : undefined}
          content={<ChartTooltip />}
          cursor={{ fill: "currentColor", opacity: 0.06 }}
          isAnimationActive={false}
          animationDuration={0}
        />
        <Bar
          dataKey="value"
          fill="#0ea5e9"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          isAnimationActive
          animationDuration={CHART_TRANSITION_MS}
          animationEasing="ease-out"
          animationMatchBy={matchByDataKey("label")}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SpendingChart({ data }: { data: ChartPoint[] }) {
  const dataKey = data.map(({ label, value }) => `${label}:${value}`).join("|");
  const nextAxisMax = getNiceAxisMax(data);
  const [displayedData, setDisplayedData] = useState(data);
  const [displayedKey, setDisplayedKey] = useState(dataKey);
  const [axisMax, setAxisMax] = useState(nextAxisMax);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (dataKey === displayedKey) return;

    setDisplayedData(data);
    setDisplayedKey(dataKey);
    setIsTransitioning(true);
    setAxisMax((currentMax) => Math.max(currentMax, nextAxisMax));

    const frame = requestAnimationFrame(() => {
      setIsTransitioning(false);
    });

    const timer = window.setTimeout(() => {
      setAxisMax(nextAxisMax);
      setIsTransitioning(false);
    }, CHART_TRANSITION_MS);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [data, dataKey, displayedKey, nextAxisMax]);

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
      <div
        className={[
          "h-56 w-full transition-[opacity,transform] duration-[420ms] ease-out will-change-transform",
          isTransitioning ? "translate-y-1 opacity-70" : "translate-y-0 opacity-100",
        ].join(" ")}
      >
        <ChartCanvas
          data={displayedData}
          tooltipDisabled={isTransitioning}
          axisMax={axisMax}
        />
      </div>
    </Card>
  );
}
