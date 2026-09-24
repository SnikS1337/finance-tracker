import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BarShapeProps } from "recharts";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { formatCurrency } from "../../lib/currency";
import type { ChartPoint } from "../../lib/chart-data";
import { t } from "../../i18n";
import { prepareDisplayData, getAxisTicks, type DisplayPoint } from "./spendingChartData";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as DisplayPoint;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      <p className="font-medium">{label}</p>
      <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">{formatCurrency(point.value)}</p>
    </div>
  );
}

function SpendingBarShape(props: BarShapeProps) {
  const { x, y, width, height, fill, payload } = props;
  if (x == null || y == null || width == null || height == null) return null;
  const left = Number(x), top = Number(y), barWidth = Number(width), barHeight = Number(height);
  if (![left, top, barWidth, barHeight].every(Number.isFinite)) return null;
  const point = payload as DisplayPoint | undefined;
  if (barHeight === 0) return <rect x={left} y={top} width={barWidth} height={0} fill={fill} />;
  const bottom = top + barHeight;
  if (!point?.isOutlier) {
    return <rect x={left} y={top} width={barWidth} height={barHeight} rx={4} ry={4} fill={fill} />;
  }
  const breakHeight = Math.min(7, Math.max(4, barWidth * 0.18));
  const breakY = top + breakHeight;
  return (
    <g>
      <rect x={left} y={breakY + 3} width={barWidth} height={Math.max(0, bottom - breakY - 3)} rx={4} ry={4} fill={fill} />
      <path d={`M ${left - 1} ${breakY + 1} L ${left + barWidth * 0.35} ${breakY + breakHeight} L ${left + barWidth * 0.65} ${breakY} L ${left + barWidth + 1} ${breakY + breakHeight - 1}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <text x={left + barWidth / 2} y={Math.max(12, top - 7)} textAnchor="middle" fill="currentColor" fontSize={10} fontWeight={500}>{point.outlierLabel}</text>
    </g>
  );
}

function ChartCanvas({ data, axisMax }: { data: DisplayPoint[]; axisMax: number }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "currentColor" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis domain={[0, axisMax]} ticks={getAxisTicks(axisMax)} allowDataOverflow tick={{ fontSize: 11, fill: "currentColor" }} axisLine={false} tickLine={false}
          tickFormatter={(v) => v >= 1_000_000 ? `${v / 1_000_000} млн` : v >= 1000 ? `${v / 1000} тыс` : String(Math.round(v))} width={72} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "currentColor", opacity: 0.06 }} isAnimationActive={false} animationDuration={0} />
        <Bar dataKey="displayValue" fill="#0ea5e9" maxBarSize={28} shape={SpendingBarShape} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * The bars grow in once, the first time a chart is shown in this app launch
 * (CSS in index.css; Recharts' own animations stay off on purpose).
 */
let barsRevealed = false;

export function SpendingChart({ data }: { data: ChartPoint[] }) {
  const prepared = prepareDisplayData(data);
  const [reveal] = useState(() => !barsRevealed && data.length > 0);
  useEffect(() => {
    if (reveal) barsRevealed = true;
  }, [reveal]);
  if (data.length === 0) {
    return <Card><h3 className="mb-3 text-sm font-semibold">{t.chart.spendingOverTime}</h3><EmptyState title={t.chart.notEnoughData} description={t.chart.notEnoughDataHint} /></Card>;
  }
  return <Card><h3 className="mb-3 text-sm font-semibold">{t.chart.spendingOverTime}</h3><div className={reveal ? "bars-reveal h-56 w-full" : "h-56 w-full"}><ChartCanvas data={prepared.data} axisMax={prepared.axisMax} /></div></Card>;
}
