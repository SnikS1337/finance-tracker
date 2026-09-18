import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { formatCurrency } from "../../lib/currency";
import type { Category } from "../../types";
import type { CategoryTotal } from "../../lib/calculations";
import { t as locale } from "../../i18n";

interface Props {
  title: string;
  totals: CategoryTotal[];
  categories: Category[];
  onSelectCategory?: (categoryId: string) => void;
  emptyMessage: string;
}

export function CategoryDonut({ title, totals, categories, onSelectCategory, emptyMessage }: Props) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const data = totals.map((ct) => ({
    ...ct,
    name: categoryById.get(ct.categoryId)?.name ?? locale.common.unknownCategory,
    color: categoryById.get(ct.categoryId)?.color ?? "#94a3b8",
  }));

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {data.length === 0 ? (
        <EmptyState title={locale.chart.notEnoughData} description={emptyMessage} />
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="total"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  isAnimationActive
                  animationDuration={600}
                  animationEasing="ease-out"
                >
                  {data.map((d) => (
                    <Cell key={d.categoryId} fill={d.color} className="cursor-pointer outline-none" />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full min-w-0 flex-1 space-y-1.5">
            {data.map((d) => (
              <button
                key={d.categoryId}
                onClick={() => onSelectCategory?.(d.categoryId)}
                className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="flex-1 truncate">{d.name}</span>
                <span className="shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">
                  {d.percentage.toFixed(0)}%
                </span>
                <span className="shrink-0 tabular-nums font-medium">{formatCurrency(d.total)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
