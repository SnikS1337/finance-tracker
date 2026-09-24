import { useState } from "react";
import { Repeat } from "lucide-react";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../../hooks/useToast";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { formatSignedCurrency } from "../../lib/currency";
import type { RecurringRule } from "../../types";
import { t } from "../../i18n";

/** Settings → "Регулярные операции": what repeats every month, and a way to stop it. */
export function RecurringManager() {
  const { recurringRules, categories, removeRecurringRule } = useAppData();
  const { showToast } = useToast();
  const [toStop, setToStop] = useState<RecurringRule | null>(null);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  if (recurringRules.length === 0) {
    return <p className="px-1 text-sm text-neutral-500 dark:text-neutral-400">{t.recurring.empty}</p>;
  }

  const sorted = recurringRules.slice().sort((a, b) => a.dayOfMonth - b.dayOfMonth);

  return (
    <>
      <div className="animate-card-in divide-y divide-neutral-100 overflow-hidden rounded-xl2 border border-neutral-200 bg-white shadow-sm dark:divide-neutral-800 dark:border-neutral-800 dark:bg-surface-dark-subtle">
        {sorted.map((rule) => {
          const category = categoryById.get(rule.categoryId);
          return (
            <div key={rule.id} className="flex min-w-0 items-center gap-3 px-4 py-3">
              <span className="shrink-0 text-lg" aria-hidden>
                {category?.icon ?? "•"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{rule.note || category?.name}</span>
                  <Repeat size={12} className="shrink-0 text-neutral-400" aria-hidden />
                </p>
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {formatSignedCurrency(rule.amount, rule.type)} · {t.recurring.monthlyOn(rule.dayOfMonth)}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setToStop(rule)}>
                {t.recurring.stop}
              </Button>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!toStop}
        onOpenChange={(open) => !open && setToStop(null)}
        title={t.recurring.stopConfirmTitle}
        description={t.recurring.stopConfirmDescription}
        confirmLabel={t.recurring.stopConfirmCta}
        onConfirm={() => {
          if (!toStop) return;
          removeRecurringRule(toStop.id);
          setToStop(null);
          showToast({ message: t.toasts.recurringStopped });
        }}
      />
    </>
  );
}
