import { useState } from "react";
import { Card } from "../ui/Card";
import { cn } from "../../lib/cn";
import { getPageTransition, PAGE_TRANSITIONS, setPageTransition, type PageTransition } from "../../lib/pageTransition";
import { t } from "../../i18n";

/** Temporary (1.6 step 7): compare page transitions on the phone, then this goes. */
export function PageTransitionSettings() {
  const [value, setValue] = useState<PageTransition>(getPageTransition);
  return (
    <Card>
      <h3 className="text-sm font-semibold">{t.settings.pageTransition.title}</h3>
      <p className="mb-3 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{t.settings.pageTransition.hint}</p>
      <div role="radiogroup" aria-label={t.settings.pageTransition.title} className="grid grid-cols-3 gap-2 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
        {PAGE_TRANSITIONS.map((v) => (
          <button
            key={v}
            role="radio"
            aria-checked={value === v}
            onClick={() => {
              setPageTransition(v);
              setValue(v);
            }}
            className={cn(
              "rounded-lg py-2 text-sm font-medium transition-colors",
              value === v
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                : "text-neutral-500 dark:text-neutral-400"
            )}
          >
            {t.settings.pageTransition.options[v]}
          </button>
        ))}
      </div>
    </Card>
  );
}
