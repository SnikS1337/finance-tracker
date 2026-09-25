import { useDeferredValue, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppData } from "../hooks/useAppData";
import { useUrlPeriod } from "../hooks/usePeriod";
import { PeriodSelector } from "../components/period/PeriodSelector";
import { TransactionList } from "../components/transactions/TransactionList";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { useTransactionSheetActions } from "../hooks/useTransactionSheet";
import { useToast } from "../hooks/useToast";
import { isDateKeyInRange } from "../lib/date-utils";
import { matchesSearch } from "../lib/search";
import type { TransactionType } from "../types";
import { Search } from "lucide-react";
import { t } from "../i18n";

type SortOption = "newest" | "oldest" | "largest" | "smallest";

export default function Transactions() {
  const { transactions, categories, removeTransaction, restoreTransaction } = useAppData();
  const { openAdd, openEdit } = useTransactionSheetActions();
  const { showToast } = useToast();
  const period = useUrlPeriod("thisMonth");
  const [searchParams, setSearchParams] = useSearchParams();
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [query, setQuery] = useState("");
  // Typing stays instant; the (possibly long) list catches up right after.
  const deferredQuery = useDeferredValue(query);
  const searching = deferredQuery.trim() !== "";
  // A search looks through all time by default (you rarely remember the month
  // of the thing you're looking for); it can be narrowed back to the period.
  const [searchAllTime, setSearchAllTime] = useState(true);
  const ignorePeriod = searching && searchAllTime;

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  // A link can point at a category that no longer exists (deleted) — then the
  // filter is ignored instead of silently showing an empty list under "All".
  const requestedCategory = searchParams.get("category");
  const categoryFilter = requestedCategory && categoryById.has(requestedCategory) ? requestedCategory : "all";
  // Archived categories are hidden from the filter list — except the one that
  // is currently filtered on (e.g. opened from a chart), so the select shows
  // what is actually being filtered.
  const filterCategories = useMemo(
    () => categories.filter((c) => !c.isArchived || c.id === categoryFilter),
    [categories, categoryFilter]
  );

  const filtered = useMemo(() => {
    let list = transactions.filter((tx) => {
      if (!ignorePeriod && !isDateKeyInRange(tx.date, period.range)) return false;
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (categoryFilter !== "all" && tx.categoryId !== categoryFilter) return false;
      return matchesSearch(tx, categoryById.get(tx.categoryId)?.name ?? "", deferredQuery);
    });

    list = list.slice().sort((a, b) => {
      switch (sort) {
        case "newest":
          return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
        case "oldest":
          return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
        case "largest":
          return b.amount - a.amount;
        case "smallest":
          return a.amount - b.amount;
      }
    });
    return list;
  }, [transactions, period.range, ignorePeriod, typeFilter, categoryFilter, deferredQuery, sort, categoryById]);
  const listKey = [
    ignorePeriod ? "all-time" : `${period.preset}:${period.customStart}:${period.customEnd}`,
    typeFilter,
    categoryFilter,
    deferredQuery,
    sort,
  ].join("|");
  const periodName = t.transactionsPage.periodName(period.preset);

  // Nothing recorded yet: no period, search or filters over an empty list —
  // just the title and the way to add the first operation.
  if (transactions.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-semibold">{t.transactionsPage.title}</h1>
        <EmptyState
          title={t.transactionsPage.emptyTitleNoData}
          description={t.transactionsPage.emptyDescriptionNoData}
          action={<Button onClick={() => openAdd()}>{t.dashboard.addTransactionCta}</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t.transactionsPage.title}</h1>
      </div>

      {/* While a search looks through all time the period doesn't apply: it's
          dimmed, and picking one narrows the search to it. */}
      <div className={ignorePeriod ? "opacity-50 transition-opacity" : "transition-opacity"}>
        <PeriodSelector
          value={period.preset}
          onChange={(preset) => {
            period.setPreset(preset);
            if (ignorePeriod) setSearchAllTime(false);
          }}
          customStart={period.customStart}
          customEnd={period.customEnd}
          onCustomChange={(start, end) => {
            period.setCustomRange(start, end);
            if (ignorePeriod) setSearchAllTime(false);
          }}
        />
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <Search size={16} className="shrink-0 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // A new search starts from "all time" again.
            if (e.target.value.trim() === "") setSearchAllTime(true);
          }}
          placeholder={t.transactionsPage.searchPlaceholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TransactionType | "all")}
          className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm dark:border-neutral-800 dark:bg-surface-dark-subtle"
        >
          <option value="all">{t.transactionsPage.allTypes}</option>
          <option value="expense">{t.transactionsPage.expensesOnly}</option>
          <option value="income">{t.transactionsPage.incomeOnly}</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => {
            const value = e.target.value;
            // Only touch `category`; the period lives in the same query string.
            setSearchParams(
              (prev) => {
                const params = new URLSearchParams(prev);
                if (value === "all") params.delete("category");
                else params.set("category", value);
                return params;
              },
              { replace: true }
            );
          }}
          className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm dark:border-neutral-800 dark:bg-surface-dark-subtle"
        >
          <option value="all">{t.transactionsPage.allCategories}</option>
          {filterCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
              {c.isArchived ? ` · ${t.categories.archived}` : ""}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm dark:border-neutral-800 dark:bg-surface-dark-subtle"
        >
          <option value="newest">{t.transactionsPage.sortNewest}</option>
          <option value="oldest">{t.transactionsPage.sortOldest}</option>
          <option value="largest">{t.transactionsPage.sortLargest}</option>
          <option value="smallest">{t.transactionsPage.sortSmallest}</option>
        </select>
      </div>

      {searching && (
        <p className="-mt-2 flex flex-wrap items-baseline gap-x-2 text-sm text-neutral-500 dark:text-neutral-400" aria-live="polite">
          <span>{ignorePeriod ? t.transactionsPage.foundAllTime(filtered.length) : t.transactionsPage.foundInPeriod(filtered.length, periodName)}</span>
          <button
            type="button"
            onClick={() => setSearchAllTime(!searchAllTime)}
            className="font-medium text-neutral-800 underline decoration-neutral-300 underline-offset-2 dark:text-neutral-100 dark:decoration-neutral-600"
          >
            {ignorePeriod ? t.transactionsPage.onlyInPeriod(periodName) : t.transactionsPage.searchAllTime}
          </button>
        </p>
      )}

      {filtered.length === 0 ? (
        <EmptyState title={t.transactionsPage.emptyTitleNoMatch} description={t.transactionsPage.emptyDescriptionNoMatch} />
      ) : (
        <TransactionList
          transactions={filtered}
          resetKey={listKey}
          categories={categories}
          onSelect={openEdit}
          onDelete={(tx) => {
            removeTransaction(tx.id);
            showToast({ message: t.toasts.transactionDeleted, actionLabel: t.toasts.undo, onAction: () => restoreTransaction(tx) });
          }}
        />
      )}
    </div>
  );
}
