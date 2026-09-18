import type { Transaction, Category, Budget, Settings, BackupData } from "../types";
import { DEFAULT_SETTINGS } from "../types";
import { DEFAULT_CATEGORIES } from "./seed";
import { t } from "../i18n";

/**
 * Storage abstraction. Nothing outside this file should touch
 * `localStorage` directly. Swapping to a remote backend later means
 * reimplementing this module's exported functions only — hooks and UI
 * are unaffected.
 */

export const SCHEMA_VERSION = 1;

const KEYS = {
  schemaVersion: "pft:schemaVersion",
  transactions: "pft:transactions",
  categories: "pft:categories",
  budgets: "pft:budgets",
  settings: "pft:settings",
} as const;

class StorageUnavailableError extends Error {
  constructor() {
    super(t.errors.storageUnavailable);
    this.name = "StorageUnavailableError";
  }
}

function isStorageAvailable(): boolean {
  try {
    const testKey = "pft:__test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isStorageAvailable()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupted entry: don't crash the app, fall back silently.
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (!isStorageAvailable()) throw new StorageUnavailableError();
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Most likely quota exceeded.
    throw new Error(
      err instanceof DOMException ? t.errors.storageFull : t.errors.saveFailed
    );
  }
}

function migrate(): void {
  const storedVersion = readJSON<number>(KEYS.schemaVersion, 0);
  if (storedVersion === SCHEMA_VERSION) return;
  // No prior versions exist yet (this is v1), so there's nothing to migrate
  // from. Future versions add `if (storedVersion < N) { ... }` steps here.
  writeJSON(KEYS.schemaVersion, SCHEMA_VERSION);
}

let initialized = false;
function ensureInitialized(): void {
  if (initialized) return;
  initialized = true;
  migrate();
  if (readJSON<Category[] | null>(KEYS.categories, null) === null) {
    writeJSON(KEYS.categories, DEFAULT_CATEGORIES);
  }
  if (readJSON<Transaction[] | null>(KEYS.transactions, null) === null) {
    writeJSON(KEYS.transactions, []);
  }
  if (readJSON<Budget[] | null>(KEYS.budgets, null) === null) {
    writeJSON(KEYS.budgets, []);
  }
  if (readJSON<Settings | null>(KEYS.settings, null) === null) {
    writeJSON(KEYS.settings, DEFAULT_SETTINGS);
  }
}

// ---------- Transactions ----------

export function getTransactions(): Transaction[] {
  ensureInitialized();
  return readJSON<Transaction[]>(KEYS.transactions, []);
}

export function saveTransactions(transactions: Transaction[]): void {
  writeJSON(KEYS.transactions, transactions);
}

export function createTransaction(tx: Transaction): Transaction {
  const all = getTransactions();
  saveTransactions([...all, tx]);
  return tx;
}

export function updateTransaction(id: string, patch: Partial<Transaction>): Transaction | null {
  const all = getTransactions();
  let updated: Transaction | null = null;
  const next = all.map((tx) => {
    if (tx.id !== id) return tx;
    updated = { ...tx, ...patch, id: tx.id, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (updated) saveTransactions(next);
  return updated;
}

export function deleteTransaction(id: string): void {
  saveTransactions(getTransactions().filter((tx) => tx.id !== id));
}

// ---------- Categories ----------

export function getCategories(): Category[] {
  ensureInitialized();
  return readJSON<Category[]>(KEYS.categories, DEFAULT_CATEGORIES);
}

export function saveCategories(categories: Category[]): void {
  writeJSON(KEYS.categories, categories);
}

export function createCategory(category: Category): Category {
  saveCategories([...getCategories(), category]);
  return category;
}

export function updateCategory(id: string, patch: Partial<Category>): Category | null {
  const all = getCategories();
  let updated: Category | null = null;
  const next = all.map((c) => {
    if (c.id !== id) return c;
    updated = { ...c, ...patch, id: c.id };
    return updated;
  });
  if (updated) saveCategories(next);
  return updated;
}

export function deleteCategory(id: string): void {
  saveCategories(getCategories().filter((c) => c.id !== id));
}

// ---------- Budgets ----------

export function getBudgets(): Budget[] {
  ensureInitialized();
  return readJSON<Budget[]>(KEYS.budgets, []);
}

export function saveBudgets(budgets: Budget[]): void {
  writeJSON(KEYS.budgets, budgets);
}

export function createBudget(budget: Budget): Budget {
  saveBudgets([...getBudgets(), budget]);
  return budget;
}

export function updateBudget(id: string, patch: Partial<Budget>): Budget | null {
  const all = getBudgets();
  let updated: Budget | null = null;
  const next = all.map((b) => {
    if (b.id !== id) return b;
    updated = { ...b, ...patch, id: b.id, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (updated) saveBudgets(next);
  return updated;
}

export function deleteBudget(id: string): void {
  saveBudgets(getBudgets().filter((b) => b.id !== id));
}

// ---------- Settings ----------

export function getSettings(): Settings {
  ensureInitialized();
  return readJSON<Settings>(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: Settings): void {
  writeJSON(KEYS.settings, settings);
}

// ---------- Backup / restore ----------

export function exportBackup(): BackupData {
  return {
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    transactions: getTransactions(),
    categories: getCategories(),
    budgets: getBudgets(),
    settings: getSettings(),
  };
}

export class InvalidBackupError extends Error {}

function isTransactionArray(v: unknown): v is Transaction[] {
  return (
    Array.isArray(v) &&
    v.every(
      (tx) =>
        tx &&
        typeof tx.id === "string" &&
        (tx.type === "income" || tx.type === "expense") &&
        typeof tx.amount === "number" &&
        Number.isSafeInteger(tx.amount) &&
        tx.amount > 0 &&
        typeof tx.categoryId === "string" &&
        typeof tx.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(tx.date)
    )
  );
}

function isCategoryArray(v: unknown): v is Category[] {
  return (
    Array.isArray(v) &&
    v.every((c) => c && typeof c.id === "string" && typeof c.name === "string" && typeof c.icon === "string")
  );
}

function isBudgetArray(v: unknown): v is Budget[] {
  return Array.isArray(v) &&
    v.every(
      (b) =>
        b &&
        typeof b.id === "string" &&
        typeof b.amount === "number" &&
        Number.isSafeInteger(b.amount) &&
        b.amount > 0 &&
        (b.categoryId === undefined || typeof b.categoryId === "string")
    );
}

/** Validates and imports a backup. Throws InvalidBackupError with a human-readable message on failure. */
export function importBackup(data: unknown): void {
  if (!data || typeof data !== "object") {
    throw new InvalidBackupError(t.errors.notValidBackup);
  }
  const backup = data as Partial<BackupData>;
  if (typeof backup.version !== "number") {
    throw new InvalidBackupError(t.errors.notValidBackup);
  }
  if (backup.version > SCHEMA_VERSION) {
    throw new InvalidBackupError(t.errors.newerVersion);
  }
  if (!isTransactionArray(backup.transactions)) {
    throw new InvalidBackupError(t.errors.invalidTransactionData);
  }
  if (!isCategoryArray(backup.categories)) {
    throw new InvalidBackupError(t.errors.invalidCategoryData);
  }
  if (backup.budgets !== undefined && !isBudgetArray(backup.budgets)) {
    throw new InvalidBackupError(t.errors.invalidBudgetData);
  }

  // De-duplicate IDs defensively in case the file was hand-edited or merged.
  const dedupe = <T extends { id: string }>(items: T[]): T[] => {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  saveCategories(dedupe(backup.categories));
  saveTransactions(dedupe(backup.transactions));
  saveBudgets(dedupe(backup.budgets ?? []));
  if (backup.settings) {
    saveSettings({ ...DEFAULT_SETTINGS, ...backup.settings, isDemoData: false });
  }
}

export function clearAllData(): void {
  saveTransactions([]);
  saveCategories(DEFAULT_CATEGORIES);
  saveBudgets([]);
  saveSettings(DEFAULT_SETTINGS);
}
