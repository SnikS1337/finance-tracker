import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { PeriodSelector } from "../period/PeriodSelector";
import { usePeriod } from "../../hooks/usePeriod";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../../hooks/useToast";
import { formatCurrency } from "../../lib/currency";
import { formatRangeLabel } from "../../lib/date-utils";
import { summarize } from "../../lib/calculations";
import { reportFileName, saveFile } from "../../lib/export";
import { cn } from "../../lib/cn";
import { t } from "../../i18n";

const REPORT_WIDTH = 360;

/** Shows `children` (laid out at a fixed `width`) scaled down to fit narrower containers. */
function FitToWidth({ width, children }: { width: number; children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // Written straight to the DOM (no state): resizing never re-renders the report.
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      const scale = Math.min(1, outer.clientWidth / width);
      inner.style.transform = scale < 1 ? `scale(${scale})` : "";
      outer.style.height = `${Math.ceil(inner.offsetHeight * scale)}px`;
    };
    update();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={outerRef} className="flex justify-center overflow-hidden">
      <div ref={innerRef} className="shrink-0 origin-top" style={{ width }}>
        {children}
      </div>
    </div>
  );
}

export function ReportGenerator() {
  const { transactions, categories } = useAppData();
  const { showToast } = useToast();
  const period = usePeriod("thisMonth");
  const [dark, setDark] = useState(false);
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Warm the PNG renderer once the report card is actually on screen (not at
  // app start), so "Download PNG" also works if the connection drops afterwards.
  useEffect(() => {
    import("html-to-image").catch(() => undefined);
  }, []);

  const { range } = period;
  const summary = useMemo(() => summarize(transactions, range), [transactions, range]);
  const { income, expenses, balance } = summary;
  const avg = summary.averagePerDay;
  const median = summary.medianPerDay;
  const topCategories = summary.expenseByCategory.slice(0, 4);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  async function handleDownload() {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      // Loaded on demand: html-to-image is only needed at the moment a PNG is
      // generated, so it stays out of the Settings chunk. (It's precached by the
      // service worker, so this still works offline in the installed app.)
      const { toSvg } = await import("html-to-image");
      if (!reportRef.current) return;
      const svgDataUrl = await toSvg(reportRef.current);
      const image = new Image();
      image.decoding = "async";

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error(t.report.generateError));
        image.src = svgDataUrl;
      });

      const scale = 3;
      const width = reportRef.current.offsetWidth;
      const height = reportRef.current.offsetHeight;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);

      const context = canvas.getContext("2d");
      if (!context) throw new Error(t.report.generateError);

      context.scale(scale, scale);
      context.drawImage(image, 0, 0, width, height);

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(t.report.generateError))), "image/png")
      );
      // Share sheet on phones (reliable "Save to Photos/Files" on iOS), download elsewhere.
      await saveFile(blob, reportFileName(range));
    } catch {
      showToast({ message: t.report.generateError, variant: "error" });
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

      {/* The PNG is always rendered from a fixed 360px layout; on narrower
          screens the on-screen preview is scaled down to fit instead of being
          cropped behind a horizontal scroll. The scale lives on a wrapper, so
          the captured node (reportRef) and the exported image are unaffected. */}
      <FitToWidth width={REPORT_WIDTH}>
        <div
          ref={reportRef}
          className={cn(
            "flex w-[360px] flex-col gap-5 rounded-3xl p-7 font-sans",
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
              <p className="mt-0.5 text-lg font-bold leading-tight tabular-nums">{formatCurrency(expenses)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t.report.income}</p>
              <p className="mt-0.5 text-lg font-bold leading-tight tabular-nums text-emerald-500">{formatCurrency(income)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t.report.balance}</p>
              <p className="mt-0.5 text-base font-bold leading-tight tabular-nums">{formatCurrency(balance)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{t.report.avgPerDay}</p>
              <p className="mt-0.5 text-base font-bold leading-tight tabular-nums">{formatCurrency(avg)}</p>
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
                {topCategories.map((c) => {
                  const category = categoryById.get(c.categoryId);
                  return (
                    <div key={c.categoryId} className="flex items-center justify-between gap-3 text-xs">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: category?.color ?? "#a3a3a3" }}
                        />
                        <span className="min-w-0 break-words">{category?.name ?? t.common.unknownCategory}</span>
                      </span>
                      <span className="shrink-0 font-semibold">{c.percentage.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="mt-2 text-center text-[10px] tracking-wide text-neutral-400">{t.report.footer}</p>
        </div>
      </FitToWidth>

      <Button onClick={handleDownload} disabled={generating} className="w-full">
        {generating ? t.report.generating : t.report.downloadPng}
      </Button>
    </Card>
  );
}
