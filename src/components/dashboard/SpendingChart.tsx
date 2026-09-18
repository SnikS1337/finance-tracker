import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, matchByDataKey } from "recharts";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { formatCurrency } from "../../lib/currency";
import type { ChartPoint } from "../../lib/chart-data";
import { t } from "../../i18n";

const CHART_TRANSITION_MS = 280;

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      <p className="font-medium">{label}</p>
      <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

function ChartCanvas({ data }: { data: ChartPoint[] }) {
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
          tick={{ fontSize: 11, fill: "currentColor" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) =>
            v >= 1_000_000 ? `${v / 1_000_000} млн` : v >= 1000 ? `${v / 1000} тыс` : String(v)
          }
          width={72}
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: "currentColor", opacity: 0.06 }}
          isAnimationActive={false}
        />
        <Bar
          dataKey="value"
          fill="#0ea5e9"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          isAnimationActive
          animationDuration={450}
          animationEasing="ease-out"
          animationMatchBy={matchByDataKey("label")}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SpendingChart({ data }: { data: ChartPoint[] }) {
  const dataKey = data.map(({ label, value }) => `${label}:${value}`).join("|");
  const [displayedData, setDisplayedData] = useState(data);
  const [displayedKey, setDisplayedKey] = useState(dataKey);
  const [incomingData, setIncomingData] = useState<ChartPoint[] | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<"idle" | "enter" | "active">("idle");

  useEffect(() => {
    if (dataKey === displayedKey) return;

    setIncomingData(data);
    setTransitionPhase("enter");

    const frame = requestAnimationFrame(() => {
      setTransitionPhase("active");
    });

    const timer = window.setTimeout(() => {
      setDisplayedData(data);
      setDisplayedKey(dataKey);
      setIncomingData(null);
      setTransitionPhase("idle");
    }, CHART_TRANSITION_MS);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [data, dataKey, displayedKey]);

  if (data.length === 0) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-semibold">{t.chart.spendingOverTime}</h3>
        <EmptyState title={t.chart.notEnoughData} description={t.chart.notEnoughDataHint} />
      </Card>
    );
  }

  const chartTransition =
    "absolute inset-0 transition-[opacity,transform] duration-[280ms] ease-out will-change-transform";

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold">{t.chart.spendingOverTime}</h3>
      <div className="relative h-56 w-full overflow-hidden">
        <div
          className={`${chartTransition} ${
            transitionPhase === "active" && incomingData ? "opacity-0 scale-[0.99] -translate-y-1" : "opacity-100 scale-100 translate-y-0"
          }`}
          aria-hidden={Boolean(incomingData)}
        >
          <ChartCanvas data={displayedData} />
        </div>

        {incomingData && (
          <div
            className={`${chartTransition} ${
              transitionPhase === "active" ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-[0.99] translate-y-1"
            }`}
          >
            <ChartCanvas data={incomingData} />
          </div>
        )}
      </div>
    </Card>
  );
}
