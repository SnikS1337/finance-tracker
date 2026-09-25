import type { Category } from "../../types";
import { cn } from "../../lib/cn";
import { t } from "../../i18n";

interface Props {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Shown in the empty state (no active category of this type): opens category management. */
  type?: Category["type"];
  onManageCategories?: () => void;
}

export function CategoryPicker({ categories, selectedId, onSelect, type = "expense", onManageCategories }: Props) {
  const active = categories.filter((c) => !c.isArchived);
  if (active.length === 0) {
    // All deleted or archived: without this the form showed an empty grid and
    // nothing could be added, with no hint why.
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-4 text-center dark:border-neutral-700">
        <p className="text-sm font-medium">{t.transactionForm.noCategories(type)}</p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t.transactionForm.noCategoriesHint}</p>
        {onManageCategories && (
          <button
            type="button"
            onClick={onManageCategories}
            className="mt-3 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            {t.transactionForm.noCategoriesCta}
          </button>
        )}
      </div>
    );
  }
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
              "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition-all duration-200 active:scale-[0.97]",
              selected
                ? "border-neutral-900 bg-neutral-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-neutral-900"
                : "border-neutral-200 bg-white hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-surface-dark-subtle dark:hover:border-neutral-700"
            )}
          >
            <span className="text-xl leading-none transition-transform duration-200">{c.icon}</span>
            <span className="max-w-full truncate">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}
