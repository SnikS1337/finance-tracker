import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, X } from "lucide-react";
import { Card } from "../ui/Card";
import { FitText } from "../ui/FitText";
import { formatCurrency } from "../../lib/currency";
import { dismissReview, isReviewDismissed, type MonthlyReview } from "../../lib/monthlyReview";
import { cn } from "../../lib/cn";
import type { Category } from "../../types";
import { t } from "../../i18n";

interface Props {
  review: MonthlyReview;
  categories: Category[];
}

/** "Итоги августа" on the first days of September. Tap → Analytics for last month. */
export function MonthlyReviewCard({ review, categories }: Props) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => isReviewDismissed(review.monthKey));
  if (dismissed) return null;

  const open = () => navigate("/analytics?period=lastMonth");
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };

  const top = review.topCategory && categories.find((c) => c.id === review.topCategory!.categoryId);
  const facts = [
    top && review.topCategory
      ? t.monthlyReview.topCategory(`${top.icon} ${top.name}`, Math.round(review.topCategory.percentage))
      : null,
    review.expenseChange !== null ? t.monthlyReview.change(Math.round(review.expenseChange), review.previousMonth) : null,
  ].filter((f): f is string => !!f);

  const stats = [
    { label: t.summary.expenses, value: review.expenses },
    { label: t.summary.income, value: review.income, className: "text-emerald-600 dark:text-emerald-400" },
    { label: t.summary.balance, value: review.balance, className: review.balance < 0 ? "text-red-600 dark:text-red-400" : undefined },
    { label: t.quickStats.averagePerDay, value: review.averagePerDay },
  ];

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={onKeyDown}
      className="relative cursor-pointer !p-3.5"
      data-testid="monthly-review"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold">{t.monthlyReview.title(review.month)}</h2>
        <button
          type="button"
          aria-label={t.monthlyReview.hide}
          title={t.monthlyReview.hide}
          onClick={(e) => {
            e.stopPropagation();
            dismissReview(review.monthKey);
            setDismissed(true);
          }}
          // 44px touch target around a small icon.
          className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-2">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0">
            <dt className="text-xs text-neutral-500 dark:text-neutral-400">{s.label}</dt>
            <dd className={cn("min-w-0 text-sm font-semibold tabular-nums", s.className)}>
              <FitText text={formatCurrency(s.value)}>{formatCurrency(s.value)}</FitText>
            </dd>
          </div>
        ))}
      </dl>

      {facts.length > 0 && (
        <ul className="mt-2.5 space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
          {facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      <p className="mt-2.5 flex items-center gap-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        {t.monthlyReview.open}
        <ChevronRight size={14} aria-hidden="true" />
      </p>
    </Card>
  );
}
