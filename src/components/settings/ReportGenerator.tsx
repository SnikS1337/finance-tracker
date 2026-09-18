import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { PeriodSelector } from "../dashboard/PeriodSelector";
import { usePeriod } from "../../hooks/usePeriod";
import { useAppData } from "../../hooks/useAppData";
import { formatCurrency } from "../../lib/currency";
import { formatRangeLabel } from "../../lib/date-utils";
import {
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateBalance,
  calculateAverageDailyExpense,
  calculateMedianDailyExpense,
  calculateExpenseCategoryTotals,
} from "../../lib/calculations";
import { cn } from "../../lib/cn";
import { t } from "../../i18n";

export function ReportGenerator() {
  const { transactions, categories } = useAppData();
  const period = usePeriod("thisMonth");
  const [dark, setDark] = useState(false);
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const { range } = period;
  const income = calculateTotalIncome(transactions, range);
  const expenses = calculateTotalExpenses(transactions, range);
  const balance = calculateBalance(transactions, range);
  const avg = calculateAverageDailyExpense(transactions, range);
  const median = calculateMedianDailyExpense(transactions, range);
  const topCategories = calculateExpenseCategoryTotals(transactions, range).slice(0, 4);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  async function handleDownload() {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const dataUrl = await toPng(reportRef.current, { pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `financial-report-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card className="space-y-4">
      <h3 className="text-sm font-semibold">{t.report.title}</h3>
      <PeriodSelector
        value={period.preset}
        onChange={period.setPreset}
        customStart={period.customStart}
        customEnd={period.customEnd}
        onCustomChange={period.setCustomRange}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
        {t.report.darkVersion}
      </label>

      <div className="overflow-x-auto">
        <div
          ref={reportRef}
          className={cn(
            "mx-auto flex w-[360px] flex-col gap-5 rounded-3xl p-7 font-sans",
            dark ? "bg-neutral-950 text-white" : "bg-gradient-to-b from-neutral-50 to-white text-neutral-900"
          )}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              {t.report.financialSummary}
            </p>
            <p className="mt-1 text-sm text-neutral-500">{formatRangeLabel(range)}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t.report.expenses}</p>
              <p className="mt-0.5 text-xl font-bold">{formatCurrency(expenses)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t.report.income}</p>
              <p className="mt-0.5 text-xl font-bold text-emerald-500">{formatCurrency(income)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t.report.balance}</p>
              <p className="mt-0.5 text-lg font-bold">{formatCurrency(balance)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t.report.avgPerDay}</p>
              <p className="mt-0.5 text-lg font-bold">{formatCurrency(avg)}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t.report.medianPerDay}</p>
            <p className="mt-0.5 text-sm font-semibold">{formatCurrency(median)}</p>
          </div>

          {topCategories.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                {t.report.topCategories}
              </p>
              <div className="space-y-1.5">
                {topCategories.map((c) => (
                  <div key={c.categoryId} className="flex items-center justify-between text-xs">
                    <span>
                      {categoryById.get(c.categoryId)?.icon} {categoryById.get(c.categoryId)?.name}
                    </span>
                    <span className="font-semibold">{c.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mt-2 text-center text-[10px] tracking-wide text-neutral-400">{t.report.footer}</p>
        </div>
      </div>

      <Button onClick={handleDownload} disabled={generating} className="w-full">
        {generating ? t.report.generating : t.report.downloadPng}
      </Button>
    </Card>
  );
}
