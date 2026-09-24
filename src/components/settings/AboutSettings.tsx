import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "../ui/Card";
import { cn } from "../../lib/cn";
import { t } from "../../i18n";

/** "О приложении": collapsed to one line (with the version); the text unfolds on tap. */
export function AboutSettings() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="!p-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="about-body"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex-1 text-sm font-semibold">{t.settings.about}</span>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">{t.settings.version}</span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={cn("shrink-0 text-neutral-400 transition-transform duration-200 ease-calm-out", open && "rotate-180")}
        />
      </button>
      <div
        id="about-body"
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-280 ease-calm-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <p className="px-4 pb-4 text-sm text-neutral-500 dark:text-neutral-400">{t.settings.aboutBody}</p>
        </div>
      </div>
    </Card>
  );
}
