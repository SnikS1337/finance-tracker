import { Suspense, type ComponentProps } from "react";
import { ChunkErrorBoundary } from "../ui/ChunkErrorBoundary";
import type { SpendingChart as SpendingChartImpl } from "./SpendingChart";
import type { CategoryDonut as CategoryDonutImpl } from "./CategoryDonut";
import { SpendingChartLazy, CategoryDonutLazy } from "./chartChunks";
import { t } from "../../i18n";

function ChartSkeleton({ title, bodyClassName }: { title: string; bodyClassName: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="rounded-xl2 border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-surface-dark-subtle"
    >
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className={bodyClassName}>
        <div className="h-full w-full rounded-xl bg-neutral-100/70 motion-safe:animate-pulse dark:bg-neutral-800/50" />
      </div>
    </div>
  );
}

/** Drop-in replacements for the chart components: same props, loaded on demand (see chartChunks.ts). */
export function SpendingChart(props: ComponentProps<typeof SpendingChartImpl>) {
  return (
    <ChunkErrorBoundary variant="inline" title={t.chart.spendingOverTime}>
      <Suspense fallback={<ChartSkeleton title={t.chart.spendingOverTime} bodyClassName="h-56 w-full" />}>
        <SpendingChartLazy {...props} />
      </Suspense>
    </ChunkErrorBoundary>
  );
}

export function CategoryDonut(props: ComponentProps<typeof CategoryDonutImpl>) {
  return (
    <ChunkErrorBoundary variant="inline" title={props.title}>
      <Suspense fallback={<ChartSkeleton title={props.title} bodyClassName="h-40 w-full" />}>
        <CategoryDonutLazy {...props} />
      </Suspense>
    </ChunkErrorBoundary>
  );
}
