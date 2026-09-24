import { LayoutDashboard, Receipt, BarChart3, Settings as SettingsIcon } from "lucide-react";
import { t } from "../../i18n";

export type NavIcon = typeof LayoutDashboard;

export interface NavItemConfig {
  to: string;
  label: string;
  icon: NavIcon;
}

/** Main sections, in tab order. Shared by the mobile bottom bar and the desktop sidebar. */
export const NAV_ITEMS: NavItemConfig[] = [
  { to: "/", label: t.nav.dashboard, icon: LayoutDashboard },
  { to: "/transactions", label: t.nav.transactions, icon: Receipt },
  { to: "/analytics", label: t.nav.analytics, icon: BarChart3 },
  { to: "/settings", label: t.nav.settings, icon: SettingsIcon },
];
