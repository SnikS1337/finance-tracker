import { cn } from "../../lib/cn";
import { t } from "../../i18n";

/**
 * Shown inside the app shell while a lazy page chunk loads. Navigation and the
 * "+" button stay on screen, so the app never turns into an empty grey page.
 * It fades in after a short delay: on a fast load (or an already-cached chunk)
 * nothing flashes at all.
 */
export function PageFallback() {
  return (
    <div role="status" aria-live="polite" className="animate-fade-in-delayed space-y-4">
      <span className="sr-only">{t.app.loadingSection}</span>
      <div className="h-6 w-32 rounded-lg bg-neutral-200/70 motion-safe:animate-pulse dark:bg-neutral-800" />
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-40" />
    </div>
  );
}

/** A neutral card-shaped placeholder that matches the real `Card` surface. */
export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-xl2 border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-surface-dark-subtle",
        className
      )}
    >
      <div className="h-full w-full rounded-xl2 bg-neutral-100/60 motion-safe:animate-pulse dark:bg-neutral-800/40" />
    </div>
  );
}
