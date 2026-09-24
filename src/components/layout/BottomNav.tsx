import { NavLink, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { NAV_ITEMS, type NavItemConfig } from "./navItems";
import { cn } from "../../lib/cn";
import { scrollToTopSmooth } from "../../lib/scroll";
import { t } from "../../i18n";


export function BottomNav({ onAdd }: { onAdd: () => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] dark:border-neutral-800 dark:bg-surface-dark/95 md:hidden">
      {/* Five equal columns (the middle one reserved for "+") so every tab sits at
          a fixed, symmetric position. `justify-around` spaced items by their label
          widths, so "Операции" ended up farther from "+" than "Аналитика". */}
      <div className="relative mx-auto grid max-w-lg grid-cols-5 items-center px-2">
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        <div aria-hidden />
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

function NavItem({ to, label, icon: Icon }: NavItemConfig) {
  const { pathname } = useLocation();
  return (
    <NavLink
      to={to}
      end={to === "/"}
      // Tapping the tab you're already on scrolls it back to the top, like native tab bars.
      onClick={() => pathname === to && scrollToTopSmooth()}
      aria-label={label}
      className={({ isActive }) =>
        cn(
          "flex min-w-0 flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors duration-200",
          isActive ? "text-neutral-900 dark:text-white" : "text-neutral-400 dark:text-neutral-500"
        )
      }
    >
      <Icon size={20} />
      <span className="max-w-full truncate">{label}</span>
    </NavLink>
  );
}
