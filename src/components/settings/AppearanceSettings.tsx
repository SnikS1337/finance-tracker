import { Card } from "../ui/Card";
import { cn } from "../../lib/cn";
import type { ThemeMode } from "../../types";
import { t } from "../../i18n";

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: t.settings.theme.light },
  { value: "dark", label: t.settings.theme.dark },
  { value: "system", label: t.settings.theme.system },
];

export function AppearanceSettings({ theme, onChange }: { theme: ThemeMode; onChange: (mode: ThemeMode) => void }) {
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold">{t.settings.appearance}</h3>
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-lg py-2 text-sm font-medium transition-colors",
              theme === o.value
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                : "text-neutral-500 dark:text-neutral-400"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
