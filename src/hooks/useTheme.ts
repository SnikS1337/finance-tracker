import { useEffect } from "react";
import type { ThemeMode } from "../types";

/** Browser UI colour per theme — the app background (see index.html / tailwind.config.js). */
export const THEME_COLORS = { light: "#f7f8fa", dark: "#14161a" } as const;

export function useTheme(theme: ThemeMode) {
  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const isDark = theme === "dark" || (theme === "system" && mql.matches);
      root.classList.toggle("dark", isDark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark ? THEME_COLORS.dark : THEME_COLORS.light);
    };

    apply();
    if (theme === "system") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
  }, [theme]);
}
