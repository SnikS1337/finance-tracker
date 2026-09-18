import { NavLink } from "react-router-dom";
import { LayoutDashboard, Receipt, BarChart3, Settings as SettingsIcon, Plus } from "lucide-react";
import { cn } from "../../lib/cn";
import { t } from "../../i18n";

const NAV_ITEMS = [
  { to: "/", label: t.nav.dashboard, icon: LayoutDashboard },
  { to: "/transactions", label: t.nav.transactions, icon: Receipt },
  { to: "/analytics", label: t.nav.analytics, icon: BarChart3 },
  { to: "/settings", label: t.nav.settings, icon: SettingsIcon },
];

export function BottomNav({ onAdd }: { onAdd: () => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] dark:border-neutral-800 dark:bg-surface-dark/95 md:hidden">
      <div className="relative mx-auto flex max-w-lg items-center justify-around px-2">
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        <div className="w-14" aria-hidden />
        {NAV_ITEMS.slice(2).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        <button
          onClick={onAdd}
          aria-label={t.nav.addTransaction}
          className="absolute left-1/2 top-[-22px] flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition-transform duration-150 ease-calm-out active:scale-95 active:duration-75 dark:bg-white dark:text-neutral-900"
        >
          <Plus size={26} />
        </button>
      </div>
    </nav>
  );
}

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof LayoutDashboard }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      aria-label={label}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-medium transition-colors duration-200",
          isActive ? "text-neutral-900 dark:text-white" : "text-neutral-400 dark:text-neutral-500"
        )
      }
    >
      <Icon size={20} />
      {label}
    </NavLink>
  );
}
