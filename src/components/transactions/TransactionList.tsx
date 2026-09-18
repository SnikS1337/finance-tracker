import { format, isToday, isYesterday } from "date-fns";
import type { Category, Transaction } from "../../types";
import { formatSignedCurrency } from "../../lib/currency";
import { fromDateKey } from "../../lib/date-utils";
import { cn } from "../../lib/cn";
import { t, dateLocale } from "../../i18n";

function groupLabel(dateKey: string): string {
  const d = fromDateKey(dateKey);
  if (isToday(d)) return t.common.today;
  if (isYesterday(d)) return t.common.yesterday;
  return format(d, "EEEE, d MMM yyyy", { locale: dateLocale });
}

interface Props {
  transactions: Transaction[];
  categories: Category[];
  onSelect: (transaction: Transaction) => void;
}

export function TransactionList({ transactions, categories, onSelect }: Props) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const groups = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (!groups.has(tx.date)) groups.set(tx.date, []);
    groups.get(tx.date)!.push(tx);
  }
  const sortedDates = [...groups.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => {
        const dayTransactions = groups.get(date)!;
        const dayTotal = dayTransactions.reduce(
          (sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount),
          0
        );
        return (
          <div key={date}>
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{groupLabel(date)}</h3>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {formatSignedCurrency(Math.abs(dayTotal), dayTotal >= 0 ? "income" : "expense")}
              </span>
            </div>
            <div className="overflow-hidden rounded-xl2 border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-surface-dark-subtle">
              {dayTransactions.map((tx, i) => {
                const category = categoryById.get(tx.categoryId);
                return (
                  <button
                    key={tx.id}
                    onClick={() => onSelect(tx)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
                      i !== 0 && "border-t border-neutral-100 dark:border-neutral-800"
                    )}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                      style={{ backgroundColor: (category?.color ?? "#999") + "22" }}
                    >
                      {category?.icon ?? "❓"}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium">
                      {category?.name ?? t.common.unknownCategory}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-900 dark:text-neutral-100"
                      )}
                    >
                      {formatSignedCurrency(tx.amount, tx.type)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
