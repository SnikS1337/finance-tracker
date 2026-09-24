import { NavLink, useLocation } from "react-router-dom";
import { Plus, Wallet } from "lucide-react";
import { NAV_ITEMS } from "./navItems";
import { navIndex, useTabClick } from "./tabTransition";
import { cn } from "../../lib/cn";
import { t } from "../../i18n";

/** Row height (h-10) + gap (gap-1), in rem: the indicator moves by this per tab. */
const ROW_STEP_REM = 2.5 + 0.25;

export function Sidebar({ onAdd }: { onAdd: () => void }) {
  const { pathname } = useLocation();
  const active = navIndex(pathname);
  const onTabClick = useTabClick();
  return (
    <aside className="app-nav--side fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-neutral-200 bg-white px-4 py-6 dark:border-neutral-800 dark:bg-surface-dark md:flex">
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
      <nav className="relative flex flex-col gap-1">
        {/* Active-item background: glides between items (transform only). */}
        {active >= 0 && (
          <div
            aria-hidden
            className="nav-indicator nav-indicator--side pointer-events-none absolute inset-x-0 top-0 h-10 rounded-lg bg-neutral-100 transition-transform duration-280 ease-calm-out dark:bg-neutral-800"
            style={{ transform: `translateY(${active * ROW_STEP_REM}rem)` }}
          />
        )}
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onTabClick(to)}
            className={({ isActive }) =>
              cn(
                "relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                isActive
                  ? "text-neutral-900 dark:text-white"
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
