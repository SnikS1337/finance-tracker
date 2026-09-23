import type { ComponentProps } from "react";
import { lazyWithPreload } from "../../lib/lazyWithPreload";
import type { SpendingChart as SpendingChartImpl } from "./SpendingChart";
import type { CategoryDonut as CategoryDonutImpl } from "./CategoryDonut";

/**
 * Recharts (+ its redux/decimal deps) is ~100 KB gzip — by far the heaviest
 * part of the app. Charts sit below the summary cards, so they're loaded as a
 * separate chunk: the dashboard's numbers render first, and the charts stream
 * in behind a same-sized placeholder (no layout jump). Both charts share the
 * same Recharts chunk, so it's downloaded once.
 */
export const SpendingChartLazy = lazyWithPreload<ComponentProps<typeof SpendingChartImpl>>(
  () => import("./SpendingChart").then((m) => ({ default: m.SpendingChart })),
  "SpendingChart"
);
export const CategoryDonutLazy = lazyWithPreload<ComponentProps<typeof CategoryDonutImpl>>(
  () => import("./CategoryDonut").then((m) => ({ default: m.CategoryDonut })),
  "CategoryDonut"
);

export const preloadCharts = () => Promise.all([SpendingChartLazy.preload(), CategoryDonutLazy.preload()]);
