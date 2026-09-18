import type { Category, Transaction, Budget } from "../types";
import { toDateKey, subDays } from "./date-utils";

const now = () => new Date().toISOString();

// Stable ids so re-seeding / tests are deterministic, and so we can safely
// detect "still using the untouched default set" if ever needed later.
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "exp-food", name: "Еда", icon: "🍜", color: "#f97316", type: "expense", isDefault: true, createdAt: now() },
  { id: "exp-groceries", name: "Продукты", icon: "🛒", color: "#22c55e", type: "expense", isDefault: true, createdAt: now() },
  { id: "exp-housing", name: "Жильё", icon: "🏠", color: "#0ea5e9", type: "expense", isDefault: true, createdAt: now() },
  { id: "exp-transport", name: "Транспорт", icon: "🚕", color: "#eab308", type: "expense", isDefault: true, createdAt: now() },
  { id: "exp-cafe", name: "Кафе", icon: "☕", color: "#a16207", type: "expense", isDefault: true, createdAt: now() },
  { id: "exp-entertainment", name: "Развлечения", icon: "🎮", color: "#8b5cf6", type: "expense", isDefault: true, createdAt: now() },
  { id: "exp-shopping", name: "Покупки", icon: "🛍️", color: "#ec4899", type: "expense", isDefault: true, createdAt: now() },
  { id: "exp-health", name: "Здоровье", icon: "💊", color: "#ef4444", type: "expense", isDefault: true, createdAt: now() },
  { id: "exp-communication", name: "Связь", icon: "📱", color: "#06b6d4", type: "expense", isDefault: true, createdAt: now() },
  { id: "exp-travel", name: "Путешествия", icon: "✈️", color: "#3b82f6", type: "expense", isDefault: true, createdAt: now() },
  { id: "exp-bills", name: "Счета", icon: "📄", color: "#64748b", type: "expense", isDefault: true, createdAt: now() },
  { id: "exp-other", name: "Другое", icon: "📦", color: "#78716c", type: "expense", isDefault: true, createdAt: now() },
  { id: "inc-salary", name: "Зарплата", icon: "💼", color: "#16a34a", type: "income", isDefault: true, createdAt: now() },
  { id: "inc-freelance", name: "Фриланс", icon: "💻", color: "#0891b2", type: "income", isDefault: true, createdAt: now() },
  { id: "inc-business", name: "Бизнес", icon: "💼", color: "#7c3aed", type: "income", isDefault: true, createdAt: now() },
  { id: "inc-gift", name: "Подарок", icon: "🎁", color: "#db2777", type: "income", isDefault: true, createdAt: now() },
  { id: "inc-other", name: "Другое", icon: "📦", color: "#78716c", type: "income", isDefault: true, createdAt: now() },
];

/** A few weeks of varied, clearly-labeled demo data so charts/budgets aren't empty on first look. */
export function buildDemoData(): { transactions: Transaction[]; budgets: Budget[] } {
  const timestamp = now();
  const mk = (
    daysAgo: number,
    type: Transaction["type"],
    amount: number,
    categoryId: string
  ): Transaction => ({
    id: `demo-${type}-${daysAgo}-${categoryId}`,
    type,
    amount,
    categoryId,
    date: toDateKey(subDays(new Date(), daysAgo)),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const transactions: Transaction[] = [
    mk(0, "expense", 45000, "exp-cafe"),
    mk(0, "expense", 120000, "exp-food"),
    mk(1, "expense", 250000, "exp-groceries"),
    mk(1, "expense", 60000, "exp-transport"),
    mk(2, "expense", 180000, "exp-food"),
    mk(3, "expense", 90000, "exp-cafe"),
    mk(4, "expense", 320000, "exp-shopping"),
    mk(5, "expense", 150000, "exp-food"),
    mk(6, "expense", 50000, "exp-transport"),
    mk(7, "expense", 6000000, "exp-housing"),
    mk(8, "expense", 200000, "exp-groceries"),
    mk(9, "expense", 75000, "exp-cafe"),
    mk(10, "expense", 400000, "exp-entertainment"),
    mk(11, "expense", 130000, "exp-food"),
    mk(12, "expense", 90000, "exp-transport"),
    mk(13, "expense", 220000, "exp-groceries"),
    mk(14, "expense", 500000, "exp-health"),
    mk(15, "expense", 160000, "exp-food"),
    mk(16, "expense", 60000, "exp-cafe"),
    mk(18, "expense", 350000, "exp-shopping"),
    mk(20, "expense", 250000, "exp-groceries"),
    mk(21, "expense", 300000, "exp-bills"),
    mk(22, "expense", 140000, "exp-food"),
    mk(24, "expense", 1200000, "exp-travel"),
    mk(26, "expense", 180000, "exp-food"),
    mk(28, "expense", 200000, "exp-groceries"),
    mk(0, "income", 2500000, "inc-freelance"),
    mk(7, "income", 30000000, "inc-salary"),
    mk(15, "income", 1500000, "inc-freelance"),
    mk(20, "income", 500000, "inc-gift"),
  ];

  const budgets: Budget[] = [
    { id: "demo-budget-monthly", amount: 15000000, createdAt: timestamp, updatedAt: timestamp },
    { id: "demo-budget-food", categoryId: "exp-food", amount: 3000000, createdAt: timestamp, updatedAt: timestamp },
    { id: "demo-budget-groceries", categoryId: "exp-groceries", amount: 2000000, createdAt: timestamp, updatedAt: timestamp },
  ];

  return { transactions, budgets };
}
