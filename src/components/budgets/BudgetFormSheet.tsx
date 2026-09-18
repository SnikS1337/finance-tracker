import { useEffect, useState } from "react";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { formatAmountInput, parseAmountInput } from "../../lib/currency";
import type { Budget, Category } from "../../types";
import { t } from "../../i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined = create overall budget; a category = create/edit that category's budget. */
  categoryId?: string;
  categories: Category[];
  existing?: Budget | null;
  onSubmit: (amount: number, categoryId?: string) => void;
  onDelete?: () => void;
}

export function BudgetFormSheet({ open, onOpenChange, categoryId, categories, existing, onSubmit, onDelete }: Props) {
  const [amountRaw, setAmountRaw] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(categoryId);

  // Resets the form to match whatever is being opened (blank for "new", populated
  // for editing an existing budget). Deliberate: synchronizes local form state with
  // the `existing`/`categoryId` props whenever the sheet opens.
  useEffect(() => {
    if (!open) return;
    // oxlint-disable-next-line react/set-state-in-effect
    setAmountRaw(existing ? String(existing.amount) : "");
    setSelectedCategoryId(existing?.categoryId ?? categoryId);
  }, [open, existing, categoryId]);

  const category = categories.find((c) => c.id === selectedCategoryId);
  const title = category ? t.budgets.categoryBudgetTitle(category.name) : t.budgets.monthlyBudget;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t.budgets.amountLabel}
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-3 focus-within:border-neutral-900 dark:border-neutral-800 dark:focus-within:border-white">
            <input
              inputMode="numeric"
              value={formatAmountInput(amountRaw)}
              onChange={(e) => setAmountRaw(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-xl font-semibold tabular-nums outline-none"
            />
            <span className="text-xl font-semibold text-neutral-400">₫</span>
          </div>
        </div>
        <div className="flex gap-2">
          {onDelete && (
            <Button variant="danger" onClick={() => { onDelete(); onOpenChange(false); }}>
              {t.budgets.removeCta}
            </Button>
          )}
          <Button
            className="flex-1"
            disabled={parseAmountInput(amountRaw) <= 0}
            onClick={() => {
              onSubmit(parseAmountInput(amountRaw), selectedCategoryId);
              onOpenChange(false);
            }}
          >
            {t.budgets.saveBudget}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
