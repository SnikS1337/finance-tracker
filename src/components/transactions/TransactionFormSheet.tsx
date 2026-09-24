import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, RotateCcw } from "lucide-react";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { CategoryPicker } from "../categories/CategoryPicker";
import { formatAmountInput, formatRubEquivalent, parseAmountInput } from "../../lib/currency";
import { subDays, toDateKey, todayKey } from "../../lib/date-utils";
import { useExchangeRate } from "../../hooks/useExchangeRate";
import type { Category, NewTransactionInput, Transaction, TransactionType } from "../../types";
import { cn } from "../../lib/cn";
import { t } from "../../i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  /** Present when editing an existing transaction. */
  transaction?: Transaction | null;
  initialType?: TransactionType;
  onSubmit: (input: NewTransactionInput) => void;
  onDelete?: (id: string) => void;
  /** Edit mode: add the same operation again, dated today. */
  onRepeat?: (input: NewTransactionInput) => void;
}

const TYPE_LABEL: Record<TransactionType, string> = {
  expense: t.transactionForm.expense,
  income: t.transactionForm.income,
};

const TYPE_ICON = {
  expense: ArrowDownCircle,
  income: ArrowUpCircle,
} as const;

export function TransactionFormSheet({
  open,
  onOpenChange,
  categories,
  transaction,
  initialType = "expense",
  onSubmit,
  onDelete,
  onRepeat,
}: Props) {
  const isEditing = !!transaction;
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountRaw, setAmountRaw] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(todayKey());
  const [error, setError] = useState<string | null>(null);
  const rate = useExchangeRate();

  // Resets the form to match whatever is being opened (blank for "add", populated
  // for "edit"). Deliberate: this synchronizes local form state with the `transaction`
  // prop whenever the sheet opens, which is exactly what an effect is for.
  useEffect(() => {
    if (!open) return;
    if (transaction) {
      // oxlint-disable-next-line react/set-state-in-effect
      setType(transaction.type);
      setAmountRaw(String(transaction.amount));
      setCategoryId(transaction.categoryId);
      setDate(transaction.date);
    } else {
      setType(initialType);
      setAmountRaw("");
      setCategoryId(null);
      setDate(todayKey());
    }
    setError(null);
  }, [open, transaction, initialType]);

  const categoriesForType = categories.filter((c) => c.type === type);
  const today = todayKey();
  const quickDates = [
    { key: today, label: t.common.today },
    { key: toDateKey(subDays(new Date(), 1)), label: t.common.yesterday },
  ];

  function handleSubmit() {
    const amount = parseAmountInput(amountRaw);
    if (amount <= 0) {
      setError(t.transactionForm.errorAmount);
      return;
    }
    if (!categoryId) {
      setError(t.transactionForm.errorCategory);
      return;
    }
    if (!date) {
      setError(t.transactionForm.errorDate);
      return;
    }
    onSubmit({ type, amount, categoryId, date });
    onOpenChange(false);
  }

  const sheetTitle = isEditing
    ? t.transactionForm.editTitle
    : type === "income"
      ? t.transactionForm.addIncomeTitle
      : t.transactionForm.addExpenseTitle;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={sheetTitle}>
      <div className="space-y-5">
        {!isEditing && (
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
            {(["expense", "income"] as TransactionType[]).map((typeOption) => {
              const Icon = TYPE_ICON[typeOption];
              return (
                <button
                  key={typeOption}
                  type="button"
                  onClick={() => {
                    setType(typeOption);
                    setCategoryId(null);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98]",
                    type === typeOption
                      ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                      : "text-neutral-500 hover:bg-white/60 dark:text-neutral-400 dark:hover:bg-neutral-700/50"
                  )}
                >
                  <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                  {TYPE_LABEL[typeOption]}
                </button>
              );
            })}
          </div>
        )}

        <div>
          <label htmlFor="amount" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t.transactionForm.amountLabel}
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-3 transition-colors focus-within:border-neutral-900 dark:border-neutral-800 dark:focus-within:border-white">
            <input
              id="amount"
              inputMode="numeric"
              enterKeyHint="done"
              autoComplete="off"
              placeholder="0"
              value={formatAmountInput(amountRaw)}
              onChange={(e) => setAmountRaw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              className="w-full bg-transparent text-2xl font-semibold tabular-nums outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
            />
            <span className="text-2xl font-semibold text-neutral-400">₫</span>
          </div>
          {/* Live, display-only rouble equivalent (same rate as the summary cards). */}
          <p
            aria-live="polite"
            className={cn(
              "mt-1 h-4 px-1 text-xs tabular-nums text-neutral-400 transition-opacity duration-150 dark:text-neutral-500",
              parseAmountInput(amountRaw) > 0 ? "opacity-100" : "opacity-0"
            )}
          >
            {parseAmountInput(amountRaw) > 0 ? formatRubEquivalent(parseAmountInput(amountRaw), rate) : ""}
          </p>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t.transactionForm.categoryLabel}
          </span>
          <CategoryPicker categories={categoriesForType} selectedId={categoryId} onSelect={setCategoryId} />
        </div>

        <div>
          <label htmlFor="date" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t.transactionForm.dateLabel}
          </label>
          <div className="flex gap-2">
            {/* Quick picks for the two dates that cover almost every entry; the
                calendar stays for anything older. */}
            {quickDates.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={date === option.key}
                onClick={() => setDate(option.key)}
                className={cn(
                  "shrink-0 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  date === option.key
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700"
                )}
              >
                {option.label}
              </button>
            ))}
            <input
              id="date"
              type="date"
              value={date}
              max={todayKey()}
              onChange={(e) => setDate(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-neutral-900 dark:border-neutral-800 dark:bg-transparent dark:focus:border-white"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          {isEditing && onDelete && transaction && (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                onDelete(transaction.id);
                onOpenChange(false);
              }}
            >
              {t.transactionForm.deleteCta}
            </Button>
          )}
          <Button type="button" onClick={handleSubmit} className="flex-1">
            {isEditing
              ? t.transactionForm.saveChanges
              : type === "income"
                ? t.transactionForm.addIncomeCta
                : t.transactionForm.addExpenseCta}
          </Button>
        </div>

        {isEditing && onRepeat && transaction && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-neutral-600 dark:text-neutral-300"
            onClick={() => {
              onRepeat({ type: transaction.type, amount: transaction.amount, categoryId: transaction.categoryId, date: todayKey() });
              onOpenChange(false);
            }}
          >
            <RotateCcw size={15} aria-hidden="true" />
            {t.transactionForm.repeatToday}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
