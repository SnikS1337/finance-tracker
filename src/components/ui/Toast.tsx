import { useCallback, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { ToastContext, type ToastItem } from "./toastStore";

// Matches the "toast-out" animation duration in tailwind.config.js — the toast
// stays mounted (playing its exit animation) for exactly this long before it's
// actually removed from state, so the departure is seen rather than snapped.
const EXIT_ANIMATION_MS = 220;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [leavingIds, setLeavingIds] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const autoTimer = timers.current.get(id);
    if (autoTimer) clearTimeout(autoTimer);
    timers.current.delete(id);

    setLeavingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      setLeavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, EXIT_ANIMATION_MS);
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { ...toast, id }]);
      const timer = setTimeout(() => dismiss(id), 4500);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-xl2 px-4 py-3 text-sm shadow-lg",
              leavingIds.has(toast.id) ? "animate-toast-out" : "animate-toast-in",
              toast.variant === "error"
                ? "bg-red-600 text-white"
                : "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
            )}
          >
            <span>{toast.message}</span>
            {toast.actionLabel && (
              <button
                onClick={() => {
                  toast.onAction?.();
                  dismiss(toast.id);
                }}
                className="shrink-0 font-medium underline underline-offset-2"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
