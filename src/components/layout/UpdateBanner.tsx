import { useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { applyAppUpdate, useUpdateAvailable } from "../../pwa/appUpdate";
import { t } from "../../i18n";

/**
 * "Доступна новая версия · Обновить". Stays until the user taps it (or hides it
 * for this session), so an update never interrupts entering an operation.
 */
export function UpdateBanner() {
  const available = useUpdateAvailable();
  const [hidden, setHidden] = useState(false);
  const [updating, setUpdating] = useState(false);
  if (!available || hidden) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+0.5rem)] z-40 flex justify-center px-4 md:pl-64">
      <div
        role="status"
        className="pointer-events-auto flex max-w-sm animate-card-in items-center gap-1 rounded-full bg-neutral-900 py-1 pl-4 pr-1 text-sm text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900"
      >
        <span className="min-w-0 truncate">{t.update.available}</span>
        <button
          type="button"
          disabled={updating}
          onClick={() => {
            setUpdating(true);
            void applyAppUpdate();
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold underline-offset-2 hover:underline disabled:opacity-60"
        >
          <RefreshCw size={14} className={updating ? "animate-spin motion-reduce:animate-none" : undefined} aria-hidden />
          {t.update.reload}
        </button>
        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label={t.update.later}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full opacity-70 hover:opacity-100"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
