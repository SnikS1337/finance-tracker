import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
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
  onDelete?: (transaction: Transaction) => void;
}

function SwipeableTransactionRow({
  transaction,
  category,
  isFirst,
  onSelect,
  onDelete,
}: {
  transaction: Transaction;
  category?: Category;
  isFirst: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const start = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const horizontal = useRef(false);

  const reset = () => {
    setOffset(0);
    dragging.current = false;
    horizontal.current = false;
  };

  return (
    <div className={cn("relative overflow-hidden", !isFirst && "border-t border-neutral-100 dark:border-neutral-800")}>
      <div
        className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-red-500 text-sm font-medium text-white"
        aria-hidden="true"
      >
        <Trash2 size={17} strokeWidth={1.9} />
        <span className="sr-only">Удалить</span>
      </div>
      <button
        type="button"
        onClick={() => {
          if (offset !== 0) reset();
          else onSelect();
        }}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          start.current = { x: touch.clientX, y: touch.clientY };
          dragging.current = true;
        }}
        onTouchMove={(e) => {
          if (!dragging.current) return;
          const touch = e.touches[0];
          const dx = touch.clientX - start.current.x;
          const dy = touch.clientY - start.current.y;
          if (!horizontal.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
            dragging.current = false;
            return;
          }
          if (Math.abs(dx) > 8) horizontal.current = true;
          if (horizontal.current) {
            e.preventDefault();
            setOffset(Math.max(-96, Math.min(0, dx)));
          }
        }}
        onTouchEnd={() => {
          if (!dragging.current) return;
          const shouldDelete = offset <= -72;
          reset();
          if (shouldDelete) onDelete?.();
        }}
        className={cn(
          "relative flex w-full items-center gap-3 bg-white px-4 py-3 text-left transition-transform duration-150 ease-out active:bg-neutral-50 dark:bg-surface-dark-subtle dark:active:bg-neutral-800/60",
          offset === 0 && "hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
        )}
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base transition-transform duration-200"
          style={{ backgroundColor: (category?.color ?? "#999") + "22" }}
        >
          {category?.icon ?? "❓"}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {category?.name ?? t.common.unknownCategory}
        </span>
        <span
          className={cn(
            "shrink-0 text-sm font-semibold tabular-nums",
            transaction.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-900 dark:text-neutral-100"
          )}
        >
          {formatSignedCurrency(transaction.amount, transaction.type)}
        </span>
      </button>
    </div>
  );
}

export function TransactionList({ transactions, categories, onSelect, onDelete }: Props) {
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
                  <SwipeableTransactionRow
                    key={tx.id}
                    transaction={tx}
                    category={category}
                    isFirst={i === 0}
                    onSelect={() => onSelect(tx)}
                    onDelete={onDelete ? () => onDelete(tx) : undefined}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
