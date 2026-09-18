import { useCallback, useState } from "react";
import type { Settings } from "../types";
import * as storage from "../lib/storage";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => storage.getSettings());

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      storage.saveSettings(next);
      return next;
    });
  }, []);

  const refresh = useCallback(() => setSettings(storage.getSettings()), []);

  return { settings, updateSettings, refresh };
}
