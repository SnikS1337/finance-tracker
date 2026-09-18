import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { ToastContext, type ToastItem } from "./toastStore";

// Matches the "toast-out" animation duration in tailwind.config.js.
const EXIT_ANIMATION_MS = 220;
const AUTO_DISMISS_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [leavingIds, setLeavingIds] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const removeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);

    const removeTimer = removeTimers.current.get(id);
    if (removeTimer) clearTimeout(removeTimer);
    removeTimers.current.delete(id);
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);

      setLeavingIds((prev) => {
        if (prev.has(id)) return prev;
        return new Set(prev).add(id);
      });

      const removeTimer = setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
        setLeavingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        removeTimers.current.delete(id);
      }, EXIT_ANIMATION_MS);

      removeTimers.current.set(id, removeTimer);
    },
    [clearTimer]
  );

  const showToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      // Keep a single toast visible. This prevents rapid actions such as
      // repeated swipe-to-delete from filling the screen with identical toasts.
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
      removeTimers.current.forEach((timer) => clearTimeout(timer));
      removeTimers.current.clear();

      const id = crypto.randomUUID();
      setLeavingIds(new Set());
      setToasts([{ ...toast, id }]);

      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      removeTimers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

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
