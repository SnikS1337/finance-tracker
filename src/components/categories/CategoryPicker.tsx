import type { Category } from "../../types";
import { cn } from "../../lib/cn";
import { t } from "../../i18n";

interface Props {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CategoryPicker({ categories, selectedId, onSelect }: Props) {
  const active = categories.filter((c) => !c.isArchived);
  return (
    <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t.transactionForm.categoryLabel}>
      {active.map((c) => {
        const selected = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(c.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
              selected
                ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-surface-dark-subtle dark:hover:border-neutral-700"
            )}
          >
            <span className="text-xl leading-none">{c.icon}</span>
            <span className="truncate max-w-full">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}
