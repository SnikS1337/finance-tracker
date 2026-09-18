export type ThemeMode = "light" | "dark" | "system";

export interface Settings {
  theme: ThemeMode;
  /** Whether the user has been through onboarding (data vs demo choice). */
  onboarded: boolean;
  /** True while the currently loaded data is the bundled demo dataset. */
  isDemoData: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  onboarded: false,
  isDemoData: false,
};
