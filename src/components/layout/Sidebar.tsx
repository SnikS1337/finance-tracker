import { NavLink } from "react-router-dom";
import { LayoutDashboard, Receipt, BarChart3, Settings as SettingsIcon, Plus, Wallet } from "lucide-react";
import { cn } from "../../lib/cn";
import { t } from "../../i18n";

const NAV_ITEMS = [
  { to: "/", label: t.nav.dashboard, icon: LayoutDashboard },
  { to: "/transactions", label: t.nav.transactions, icon: Receipt },
  { to: "/analytics", label: t.nav.analytics, icon: BarChart3 },
  { to: "/settings", label: t.nav.settings, icon: SettingsIcon },
];

export function Sidebar({ onAdd }: { onAdd: () => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-neutral-200 bg-white px-4 py-6 dark:border-neutral-800 dark:bg-surface-dark md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <Wallet size={22} />
        <span className="font-semibold">{t.nav.appName}</span>
      </div>
      <button
        onClick={onAdd}
        className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        <Plus size={18} /> {t.nav.addTransaction}
      </button>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                  : "text-neutral-500 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800/60"
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
