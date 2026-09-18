import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, matchByDataKey } from "recharts";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { formatCurrency } from "../../lib/currency";
import type { ChartPoint } from "../../lib/chart-data";
import { t } from "../../i18n";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      <p className="font-medium">{label}</p>
      <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export function SpendingChart({ data }: { data: ChartPoint[] }) {
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold">{t.chart.spendingOverTime}</h3>
      {data.length === 0 ? (
        <EmptyState title={t.chart.notEnoughData} description={t.chart.notEnoughDataHint} />
      ) : (
        <div className="h-56 w-full">
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
        </div>
      )}
    </Card>
  );
}
