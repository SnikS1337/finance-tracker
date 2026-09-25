import { Suspense, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { UpdateBanner } from "./UpdateBanner";
import { TransactionFormSheet } from "../transactions/TransactionFormSheet";
import { useTransactionSheet } from "../../hooks/useTransactionSheet";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../../hooks/useToast";
import { ChunkErrorBoundary } from "../ui/ChunkErrorBoundary";
import { PageFallback } from "../ui/PageFallback";
import { useToday } from "../../hooks/useToday";
import { orderCategoriesByUsage } from "../../lib/categoryOrder";
import { findBudgetCrossing } from "../../lib/budgetAlerts";
import { fromDateKey } from "../../lib/date-utils";
import { budgetPeriod } from "../../lib/budgets";
import { newId } from "../../lib/id";
import { rowMotion } from "../transactions/rowMotion";
import { navIndex } from "./tabTransition";
import type { Transaction } from "../../types";
import { t } from "../../i18n";

export function AppShell() {
  const { state, openAdd, close } = useTransactionSheet();
  const {
    transactions,
    categories,
    budgets,
    addTransaction,
    editTransaction,
    removeTransaction,
    restoreTransaction,
    startRecurring,
  } = useAppData();
  const { showToast } = useToast();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const today = useToday();

  // Most recently used category first, then by frequency — the one you want is
  // usually in the first row.
  const orderedCategories = useMemo(() => orderCategoriesByUsage(categories, transactions), [categories, transactions]);

  /** " · Бюджет «Еда»: 85%" when this change pushed a budget past 80% or 100%. */
  function budgetNote(after: Transaction[]): string {
    const crossing = findBudgetCrossing(budgets, categories, transactions, after, fromDateKey(today));
    if (!crossing) return "";
    const period = budgetPeriod(crossing.budget);
    const label = crossing.category
      ? t.toasts.categoryBudgetLabel(crossing.category.name, period)
      : period === "week"
        ? t.budgets.weeklyBudget
        : t.budgets.monthlyBudget;
    return ` · ${t.toasts.budgetUsage(label, crossing.percent)}`;
  }

  // Each tab opens at the top. Without this the window keeps the previous tab's
  // scroll offset (it's one shared document), so switching from a scrolled
  // Transactions list dropped you into the middle of Settings.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Which way the page moves in: from the right when going to a tab further
  // right, from the left when going back (0 when not between two tabs).
  // Worked out once per route change (state adjusted during render, the React
  // pattern for "derive from the previous value"), so a re-render mid-animation
  // can't change it.
  const tabIndex = navIndex(pathname);
  const [entrance, setEntrance] = useState({ pathname, tabIndex, dir: 0, switched: false });
  if (entrance.pathname !== pathname) {
    const from = entrance.tabIndex;
    const dir = from < 0 || tabIndex < 0 || from === tabIndex ? 0 : tabIndex > from ? 1 : -1;
    setEntrance({ pathname, tabIndex, dir, switched: true });
  }

  return (
    <div className="min-h-screen md:pl-60">
      <Sidebar onAdd={() => openAdd()} />
      {/* overflow-x: clip — the page sliding in sideways must not widen the
          document: on phones that shifted the whole viewport, bottom nav included,
          for the length of the animation. `clip` (unlike `hidden`) keeps the
          sticky day headers in the list working. */}
      <main className="mx-auto max-w-2xl overflow-x-clip px-4 pb-28 pt-6 md:max-w-3xl md:px-8 md:pb-10">
        {/* Keyed by route: an error on one page (e.g. a chunk that failed to load
            offline) must not stick around after navigating to another page. */}
        <ChunkErrorBoundary key={pathname}>
          <Suspense fallback={<PageFallback />}>
            {/* The page slides in when the route changes (remounts with the route
                key); the old page already started leaving on tap (playPageExit).
                Pure CSS (index.css), so taps are never blocked while it plays. */}
            <div className={entrance.switched ? "page-enter page-enter--switch" : "page-enter"} style={{ "--page-dir": entrance.dir } as CSSProperties}>
              <Outlet />
            </div>
          </Suspense>
        </ChunkErrorBoundary>
      </main>
      <BottomNav onAdd={() => openAdd()} />
      <UpdateBanner />

      <TransactionFormSheet
        open={state.open}
        onOpenChange={(open) => !open && close()}
        categories={orderedCategories}
        transaction={state.transaction}
        initialType={state.initialType}
        onSubmit={(input, options) => {
          if (state.transaction) {
            const id = state.transaction.id;
            const after = transactions.map((tx) => (tx.id === id ? { ...tx, ...input } : tx));
            const note = budgetNote(after);
            editTransaction(id, input);
            showToast({ message: t.toasts.transactionUpdated + note });
          } else if (options?.repeatMonthly) {
            // The first occurrence is this operation itself; the rule then adds
            // one on the same day every month (catching up if the date is in the past).
            const ruleId = newId();
            const now = new Date().toISOString();
            const first: Transaction = { id: newId(), ...input, recurringId: ruleId, createdAt: now, updatedAt: now };
            const caughtUp = startRecurring(
              {
                id: ruleId,
                type: input.type,
                amount: input.amount,
                categoryId: input.categoryId,
                ...(input.note ? { note: input.note } : {}),
                dayOfMonth: fromDateKey(input.date).getDate(),
                startDate: input.date,
                lastDate: input.date,
                createdAt: now,
              },
              first
            );
            rowMotion.markAdded(first.id);
            const extra = caughtUp > 0 ? ` · ${t.toasts.recurringCaughtUp(caughtUp)}` : "";
            showToast({ message: t.toasts.recurringCreated + extra + budgetNote([...transactions, first]) });
          } else {
            const added = addTransaction(input);
            rowMotion.markAdded(added.id);
            const note = budgetNote([...transactions, added]);
            showToast({ message: (input.type === "income" ? t.toasts.incomeAdded : t.toasts.expenseAdded) + note });
          }
        }}
        onManageCategories={() => {
          close();
          navigate("/settings?section=categories");
        }}
        onRepeat={(input) => {
          const added = addTransaction(input);
          rowMotion.markAdded(added.id);
          showToast({ message: t.toasts.repeatedToday + budgetNote([...transactions, added]) });
        }}
        onDelete={(id) => {
          const toRestore = state.transaction;
          rowMotion.markRemoved(id);
          removeTransaction(id);
          showToast({
            message: t.toasts.transactionDeleted,
            actionLabel: t.toasts.undo,
            onAction: () => toRestore && restoreTransaction(toRestore),
          });
        }}
      />
    </div>
  );
}
