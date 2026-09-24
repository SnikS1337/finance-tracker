import { useEffect, useState } from "react";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import type { Category } from "../../types";
import { t } from "../../i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  otherCategories: Category[];
  transactionCount: number;
  onConfirm: (targetCategoryId: string) => void;
}

export function ReassignCategorySheet({ open, onOpenChange, category, otherCategories, transactionCount, onConfirm }: Props) {
  const [targetId, setTargetId] = useState<string>(otherCategories[0]?.id ?? "");

  // Resets to the first available target whenever the sheet opens for a
  // (possibly different) category. Deliberately does NOT depend on
  // `otherCategories` itself: that array is recreated on every render of the
  // parent (it's built with an inline `.filter(...)`), so depending on it
  // would reset the user's dropdown choice on any unrelated re-render while
  // this sheet is open, not just when it's actually opened.
  useEffect(() => {
    if (!open) return;
    // oxlint-disable-next-line react/set-state-in-effect
    setTargetId(otherCategories[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category?.id]);

  if (!category) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t.categories.reassignTitle}>
      <div className="space-y-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          {t.categories.reassignDescription(transactionCount, category.name)}
        </p>
        {otherCategories.length === 0 ? (
          <p className="text-sm text-red-600 dark:text-red-400">{t.categories.reassignNoTarget(category.type)}</p>
        ) : (
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm dark:border-neutral-800 dark:bg-transparent"
          >
            {otherCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        )}
        <Button
          className="w-full"
          disabled={!targetId}
          onClick={() => {
            onConfirm(targetId);
            onOpenChange(false);
          }}
        >
          {t.categories.reassignCta}
        </Button>
      </div>
    </Sheet>
  );
}
