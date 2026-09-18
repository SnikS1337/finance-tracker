import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppData } from "../hooks/useAppData";
import { usePeriod } from "../hooks/usePeriod";
import { PeriodSelector } from "../components/dashboard/PeriodSelector";
import { TransactionList } from "../components/transactions/TransactionList";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { useTransactionSheet } from "../hooks/useTransactionSheet";
import { isDateKeyInRange } from "../lib/date-utils";
import type { TransactionType } from "../types";
import { Search } from "lucide-react";
import { t } from "../i18n";

type SortOption = "newest" | "oldest" | "largest" | "smallest";

export default function Transactions() {
  const { transactions, categories } = useAppData();
  const { openAdd, openEdit } = useTransactionSheet();
  const period = usePeriod("thisMonth");
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get("category") ?? "all";
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [query, setQuery] = useState("");

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = transactions.filter((tx) => {
      if (!isDateKeyInRange(tx.date, period.range)) return false;
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (categoryFilter !== "all" && tx.categoryId !== categoryFilter) return false;
      if (q) {
        const name = categoryById.get(tx.categoryId)?.name.toLowerCase() ?? "";
        if (!name.includes(q)) return false;
      }
      return true;
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
  }, [transactions, period.range, typeFilter, categoryFilter, query, sort, categoryById]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t.transactionsPage.title}</h1>
      </div>

      <PeriodSelector
        value={period.preset}
        onChange={period.setPreset}
        customStart={period.customStart}
        customEnd={period.customEnd}
        onCustomChange={period.setCustomRange}
      />

      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <Search size={16} className="shrink-0 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
          onChange={(e) => setSearchParams(e.target.value === "all" ? {} : { category: e.target.value })}
          className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm dark:border-neutral-800 dark:bg-surface-dark-subtle"
        >
          <option value="all">{t.transactionsPage.allCategories}</option>
          {categories
            .filter((c) => !c.isArchived)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
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

      {filtered.length === 0 ? (
        <EmptyState
          title={transactions.length === 0 ? t.transactionsPage.emptyTitleNoData : t.transactionsPage.emptyTitleNoMatch}
          description={
            transactions.length === 0
              ? t.transactionsPage.emptyDescriptionNoData
              : t.transactionsPage.emptyDescriptionNoMatch
          }
          action={
            transactions.length === 0 ? (
              <Button onClick={() => openAdd()}>{t.dashboard.addTransactionCta}</Button>
            ) : undefined
          }
        />
      ) : (
        <TransactionList transactions={filtered} categories={categories} onSelect={openEdit} />
      )}
    </div>
  );
}
