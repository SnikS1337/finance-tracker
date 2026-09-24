import { createContext, type Context } from "react";

export interface ToastItem {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "default" | "error";
  /** Informational: shown only if it wouldn't replace a toast with an action (e.g. "Отменить"). */
  passive?: boolean;
}

export interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, "id">) => void;
}

export const ToastContext: Context<ToastContextValue | null> = createContext<ToastContextValue | null>(null);
