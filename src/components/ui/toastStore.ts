import { createContext, type Context } from "react";

export interface ToastItem {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "default" | "error";
}

export interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, "id">) => void;
}

export const ToastContext: Context<ToastContextValue | null> = createContext<ToastContextValue | null>(null);
