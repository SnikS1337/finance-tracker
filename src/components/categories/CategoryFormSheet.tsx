import { useEffect, useState } from "react";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";
import type { Category, NewCategoryInput, TransactionType } from "../../types";
import { t } from "../../i18n";

const ICON_CHOICES = [
  "🍜", "🛒", "🏠", "🚕", "☕", "🎮", "🛍️", "💊", "📱", "✈️", "📄", "📦",
  "💼", "💻", "🎁", "🐾", "🎓", "🧾", "🚗", "🧴",
];
const COLOR_CHOICES = [
  "#f97316", "#22c55e", "#0ea5e9", "#eab308", "#a16207", "#8b5cf6",
  "#ec4899", "#ef4444", "#06b6d4", "#3b82f6", "#64748b", "#16a34a",
];

const TYPE_LABEL: Record<TransactionType, string> = {
  expense: t.categories.typeExpense,
  income: t.categories.typeIncome,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  defaultType?: TransactionType;
  onSubmit: (input: NewCategoryInput) => void;
}

export function CategoryFormSheet({ open, onOpenChange, category, defaultType = "expense", onSubmit }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_CHOICES[0]);
  const [color, setColor] = useState(COLOR_CHOICES[0]);
  const [type, setType] = useState<TransactionType>(defaultType);

  // Resets the form to match whatever is being opened (blank for "new category",
  // populated for "edit"). Deliberate: synchronizes local form state with the
  // `category` prop whenever the sheet opens.
  useEffect(() => {
    if (!open) return;
    // oxlint-disable-next-line react/set-state-in-effect
    setName(category?.name ?? "");
    setIcon(category?.icon ?? ICON_CHOICES[0]);
    setColor(category?.color ?? COLOR_CHOICES[0]);
    setType(category?.type ?? defaultType);
  }, [open, category, defaultType]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={category ? t.categories.editCategoryTitle : t.categories.newCategoryTitle}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t.categories.nameLabel}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.categories.namePlaceholder}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-800 dark:bg-transparent dark:focus:border-white"
          />
        </div>

        {!category && (
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
            {(["expense", "income"] as TransactionType[]).map((typeOption) => (
              <button
                key={typeOption}
                onClick={() => setType(typeOption)}
                className={cn(
                  "rounded-lg py-2 text-sm font-medium transition-colors duration-200",
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
          <span className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t.categories.iconLabel}
          </span>
          <div className="grid grid-cols-8 gap-1.5">
            {ICON_CHOICES.map((i) => (
              <button
                key={i}
                onClick={() => setIcon(i)}
                className={cn(
                  "flex h-9 items-center justify-center rounded-lg border text-lg transition-colors duration-200",
                  icon === i ? "border-neutral-900 dark:border-white" : "border-neutral-200 dark:border-neutral-800"
                )}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t.categories.colorLabel}
          </span>
          <div className="flex flex-wrap gap-2">
            {COLOR_CHOICES.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`${t.categories.colorLabel} ${c}`}
                className={cn(
                  "h-8 w-8 rounded-full ring-offset-2 transition-transform duration-200 ease-calm-out hover:scale-110 dark:ring-offset-surface-dark-subtle",
                  color === c && "ring-2 ring-neutral-900 dark:ring-white"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <Button
          className="w-full"
          disabled={!name.trim()}
          onClick={() => {
            onSubmit({ name: name.trim(), icon, color, type });
            onOpenChange(false);
          }}
        >
          {category ? t.categories.saveCta : t.categories.createCta}
        </Button>
      </div>
    </Sheet>
  );
}
