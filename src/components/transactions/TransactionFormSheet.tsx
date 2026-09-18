import { useEffect, useState } from "react";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { CategoryPicker } from "../categories/CategoryPicker";
import { formatAmountInput, parseAmountInput } from "../../lib/currency";
import { todayKey } from "../../lib/date-utils";
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
  mode?: "quick" | "full";
  onSubmit: (input: NewTransactionInput) => void;
  onDelete?: (id: string) => void;
}

const TYPE_LABEL: Record<TransactionType, string> = {
  expense: t.transactionForm.expense,
  income: t.transactionForm.income,
};

export function TransactionFormSheet({
  open,
  onOpenChange,
  categories,
  transaction,
  initialType = "expense",
  onSubmit,
  onDelete,
}: Props) {
  const isEditing = !!transaction;
  const isQuickAdd = mode === "quick" && !isEditing;
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountRaw, setAmountRaw] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(todayKey());
  const [error, setError] = useState<string | null>(null);

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

  const sheetTitle = isQuickAdd
    ? t.quickAdd.title
    : isEditing
      ? t.transactionForm.editTitle
      : type === "income"
        ? t.transactionForm.addIncomeTitle
        : t.transactionForm.addExpenseTitle;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={sheetTitle}>
      <div className="space-y-5">
        {!isEditing && !isQuickAdd && (
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
            {(["expense", "income"] as TransactionType[]).map((typeOption) => (
              <button
                key={typeOption}
                type="button"
                onClick={() => {
                  setType(typeOption);
                  setCategoryId(null);
                }}
                className={cn(
                  "rounded-lg py-2 text-sm font-medium transition-colors",
                  type === typeOption
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                    : "text-neutral-500 dark:text-neutral-400"
                )}
              >
                {TYPE_LABEL[typeOption]}
              </button>
            ))}
          </div>
        )}

        <div>
          <label htmlFor="amount" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {isQuickAdd ? t.quickAdd.amountLabel : t.transactionForm.amountLabel}
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-3 focus-within:border-neutral-900 dark:border-neutral-800 dark:focus-within:border-white">
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
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {isQuickAdd ? t.quickAdd.categoryLabel : t.transactionForm.categoryLabel}
          </span>
          <CategoryPicker categories={categoriesForType} selectedId={categoryId} onSelect={setCategoryId} />
        </div>

        {!isQuickAdd && <div>
          <label htmlFor="date" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t.transactionForm.dateLabel}
          </label>
          <input
            id="date"
            type="date"
            value={date}
            max={todayKey()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-800 dark:bg-transparent dark:focus:border-white"
          />
        </div>}

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
            {isQuickAdd
              ? type === "income"
                ? t.quickAdd.addIncome
                : t.quickAdd.addExpense
              : isEditing
                ? t.transactionForm.saveChanges
                : type === "income"
                  ? t.transactionForm.addIncomeCta
                  : t.transactionForm.addExpenseCta}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
