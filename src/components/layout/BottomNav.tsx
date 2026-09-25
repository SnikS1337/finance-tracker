import { NavLink } from "react-router-dom";
import { Plus } from "lucide-react";
import { NAV_ITEMS, type NavItemConfig } from "./navItems";
import { useShownTab, useTabHandlers } from "./tabTransition";
import { cn } from "../../lib/cn";
import { t } from "../../i18n";

/** Grid column of each tab: the middle column (2) is reserved for "+". */
const TAB_COLUMN = [0, 1, 3, 4];

export function BottomNav({ onAdd }: { onAdd: () => void }) {
  const active = useShownTab();
  const handlers = useTabHandlers();

  return (
    <nav className="app-nav--bottom fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] dark:border-neutral-800 dark:bg-surface-dark/95 md:hidden">
      {/* Five equal columns (the middle one reserved for "+") so every tab sits at
          a fixed, symmetric position. `justify-around` spaced items by their label
          widths, so "Операции" ended up farther from "+" than "Аналитика". */}
      <div className="relative mx-auto grid max-w-lg grid-cols-5 items-center px-2">
        {/* Active-tab marker: glides between tabs (transform only). */}
        {active >= 0 && (
          <div aria-hidden className="pointer-events-none absolute inset-x-2 top-0">
            <div
              className="nav-indicator flex w-1/5 justify-center transition-transform duration-150 ease-out"
              style={{ transform: `translateX(${TAB_COLUMN[active] * 100}%)` }}
            >
              <span className="h-[3px] w-6 rounded-b-full bg-neutral-900 dark:bg-white" />
            </div>
          </div>
        )}
        {NAV_ITEMS.slice(0, 2).map((item, i) => (
          <NavItem key={item.to} {...item} shown={active === i} {...handlers(item.to)} />
        ))}
        <div aria-hidden />
        {NAV_ITEMS.slice(2).map((item, i) => (
          <NavItem key={item.to} {...item} shown={active === i + 2} {...handlers(item.to)} />
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

function NavItem({
  to,
  label,
  icon: Icon,
  shown,
  ...handlers
}: NavItemConfig & { shown: boolean } & ReturnType<ReturnType<typeof useTabHandlers>>) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      {...handlers}
      aria-label={label}
      className={cn(
        // Colour follows the touched tab at once (no fade); the icon dips on press.
        "group/tab flex min-w-0 touch-manipulation flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium",
        shown ? "text-neutral-900 dark:text-white" : "text-neutral-400 dark:text-neutral-500"
      )}
    >
      <Icon size={20} className="transition-transform duration-100 ease-out group-active/tab:scale-90" />
      <span className="max-w-full truncate">{label}</span>
    </NavLink>
  );
}
