import { useCallback, useState } from "react";
import type { Settings } from "../types";
import * as storage from "../lib/storage";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => storage.getSettings());

  // Written to storage right away (not inside a state updater, which React may
  // run later): a `refresh()` right after must read the new settings. That's
  // what "Посмотреть на демо-данных" does — with the lazy write, the refresh
  // re-read the old `onboarded: false` and the app stayed on onboarding.
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const next = { ...storage.getSettings(), ...patch };
    storage.saveSettings(next);
    setSettings(next);
  }, []);

  const refresh = useCallback(() => setSettings(storage.getSettings()), []);

  return { settings, updateSettings, refresh };
}
