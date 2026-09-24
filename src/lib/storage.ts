import type { Transaction, Category, Budget, Settings, BackupData, RecurringRule } from "../types";
import { DEFAULT_SETTINGS } from "../types";
import { DEFAULT_CATEGORIES } from "./seed";
import { isValidAmount } from "./currency";
import { fromDateKey } from "./date-utils";
import { materializeRecurring } from "./recurring";
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
  recurring: "pft:recurring",
} as const;

/**
 * A write to storage failed (full, unavailable, blocked). The message is
 * user-facing; nothing was changed. The UI reports these and keeps the user's
 * input (see AppDataContext).
 */
export class StorageWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageWriteError";
  }
}

class StorageUnavailableError extends StorageWriteError {
  constructor() {
    super(t.errors.storageUnavailable);
    this.name = "StorageUnavailableError";
  }
}

// Probing writes and removes a key; doing that before every single read and
// write was wasted work. A successful probe is remembered; a failed one is
// retried next time (storage can become available again, e.g. after the user
// frees space or leaves private mode).
let storageKnownAvailable = false;

function isStorageAvailable(): boolean {
  if (storageKnownAvailable) return true;
  try {
    const testKey = "pft:__test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    storageKnownAvailable = true;
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
    throw new StorageWriteError(err instanceof DOMException ? t.errors.storageFull : t.errors.saveFailed);
  }
}

/**
 * Writes several keys as one unit: if any write fails (typically quota
 * exceeded), every key is put back exactly as it was before, so the app never
 * ends up with, say, new categories but old transactions.
 */
function writeAllOrNothing(entries: Array<[key: string, value: unknown]>): void {
  if (!isStorageAvailable()) throw new StorageUnavailableError();
  const previous = entries.map(([key]) => [key, window.localStorage.getItem(key)] as const);
  try {
    for (const [key, value] of entries) window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    for (const [key, raw] of previous) {
      try {
        if (raw === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, raw);
      } catch {
        // Restoring an earlier value can't need more space than it used before;
        // nothing sensible left to do if even that fails.
      }
    }
    throw new StorageWriteError(err instanceof DOMException ? t.errors.storageFull : t.errors.saveFailed);
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

// ---------- Collections ----------

/**
 * Get/save/create/update/delete for one stored list. `touch` lets a
 * collection stamp fields on update (e.g. `updatedAt`).
 */
function collection<T extends { id: string }>(
  key: string,
  fallback: () => T[],
  isItem: (v: unknown) => v is T,
  touch: (item: T) => T = (item) => item
) {
  // Read defensively: whatever is stored (hand-edited, half-written, from a
  // buggy older version) must not crash the app. Not a list → the fallback;
  // broken entries are skipped (and dropped at the next write).
  const getAll = (): T[] => {
    ensureInitialized();
    const raw = readJSON<unknown>(key, null);
    if (!Array.isArray(raw)) return fallback();
    return raw.filter(isItem).map(withTimestamps);
  };
  const saveAll = (items: T[]): void => writeJSON(key, items);
  return {
    getAll,
    saveAll,
    create(item: T): T {
      saveAll([...getAll(), item]);
      return item;
    },
    update(id: string, patch: Partial<T>): T | null {
      let updated: T | null = null;
      const next = getAll().map((item) => {
        if (item.id !== id) return item;
        updated = touch({ ...item, ...patch, id: item.id });
        return updated;
      });
      if (updated) saveAll(next);
      return updated;
    },
    remove(id: string): void {
      saveAll(getAll().filter((item) => item.id !== id));
    },
  };
}

const stampUpdatedAt = <T extends { updatedAt: string }>(item: T): T => ({ ...item, updatedAt: new Date().toISOString() });

// Validators are function declarations further down (hoisted).
const transactionStore = collection<Transaction>(KEYS.transactions, () => [], isTransactionItem, stampUpdatedAt);
const categoryStore = collection<Category>(KEYS.categories, () => DEFAULT_CATEGORIES, isCategoryItem);
const budgetStore = collection<Budget>(KEYS.budgets, () => [], isBudgetItem, stampUpdatedAt);
const recurringStore = collection<RecurringRule>(KEYS.recurring, () => [], isRecurringItem);

// ---------- Transactions ----------

export const getTransactions = transactionStore.getAll;
export const saveTransactions = transactionStore.saveAll;
export const createTransaction = transactionStore.create;
export const updateTransaction = transactionStore.update;
export const deleteTransaction = transactionStore.remove;

// ---------- Categories ----------

export const getCategories = categoryStore.getAll;
export const saveCategories = categoryStore.saveAll;
export const createCategory = categoryStore.create;
export const updateCategory = categoryStore.update;

/** Deletes a category together with its budget and repeating operations (neither can outlive its category). */
export function deleteCategory(id: string): void {
  writeAllOrNothing([
    [KEYS.categories, getCategories().filter((c) => c.id !== id)],
    [KEYS.budgets, getBudgets().filter((b) => b.categoryId !== id)],
    [KEYS.recurring, getRecurringRules().filter((r) => r.categoryId !== id)],
  ]);
}

/** Moves every operation (and repeating operation) of one category to another, in one write. */
export function reassignCategory(fromId: string, toId: string): void {
  const move = <T extends { categoryId: string }>(item: T): T => (item.categoryId === fromId ? { ...item, categoryId: toId } : item);
  writeAllOrNothing([
    [KEYS.transactions, getTransactions().map(move)],
    [KEYS.recurring, getRecurringRules().map(move)],
  ]);
}

// ---------- Budgets ----------

export const getBudgets = budgetStore.getAll;
export const saveBudgets = budgetStore.saveAll;
export const createBudget = budgetStore.create;
export const updateBudget = budgetStore.update;
export const deleteBudget = budgetStore.remove;

// ---------- Repeating operations ----------

export const getRecurringRules = recurringStore.getAll;
export const createRecurringRule = recurringStore.create;

/**
 * Starts a repeating operation: its first occurrence and the rule are written
 * together, so a full storage can't leave an operation pointing at a missing rule.
 */
export function createRecurring(rule: RecurringRule, first: Transaction): void {
  writeAllOrNothing([
    [KEYS.transactions, [...getTransactions(), first]],
    [KEYS.recurring, [...getRecurringRules(), rule]],
  ]);
}
export const deleteRecurringRule = recurringStore.remove;

/**
 * Adds every repeating operation that has come due up to `today` (including
 * months missed while the app wasn't opened). Transactions and rules are
 * written together, and occurrence ids are deterministic, so running this
 * twice — or in two tabs — never adds duplicates. Returns how many were added.
 */
export function applyRecurring(today: string): number {
  const rules = getRecurringRules();
  if (rules.length === 0) return 0;
  const result = materializeRecurring(rules, getTransactions(), today);
  if (result.added === 0 && result.rules.every((r, i) => r === rules[i])) return 0;
  writeAllOrNothing([
    [KEYS.transactions, result.transactions],
    [KEYS.recurring, result.rules],
  ]);
  return result.added;
}

// ---------- Settings ----------

export function getSettings(): Settings {
  ensureInitialized();
  const raw = readJSON<unknown>(KEYS.settings, null);
  if (!isObject(raw)) return DEFAULT_SETTINGS;
  // Known fields with valid values only; anything else falls back to the default.
  return {
    theme: typeof raw.theme === "string" && THEMES.has(raw.theme) ? (raw.theme as Settings["theme"]) : DEFAULT_SETTINGS.theme,
    onboarded: typeof raw.onboarded === "boolean" ? raw.onboarded : DEFAULT_SETTINGS.onboarded,
    isDemoData: typeof raw.isDemoData === "boolean" ? raw.isDemoData : DEFAULT_SETTINGS.isDemoData,
  };
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
    recurring: getRecurringRules(),
  };
}

export class InvalidBackupError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isTransactionType = (v: unknown) => v === "income" || v === "expense";
const THEMES = new Set(["light", "dark", "system"]);
/** Notes are capped at MAX_NOTE_LENGTH in the form; imports allow some slack for hand-edited files. */
const MAX_IMPORTED_NOTE = 500;

function isValidDateKey(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(fromDateKey(v).getTime());
}

// ---------- Validation (used on import and on every read) ----------

function isTransactionItem(tx: unknown): tx is Transaction {
  return (
        isObject(tx) &&
        isNonEmptyString(tx.id) &&
        isTransactionType(tx.type) &&
        isValidAmount(tx.amount) &&
        isNonEmptyString(tx.categoryId) &&
        isValidDateKey(tx.date) &&
        (tx.note === undefined || (typeof tx.note === "string" && tx.note.length <= MAX_IMPORTED_NOTE)) &&
        (tx.recurringId === undefined || isNonEmptyString(tx.recurringId))
  );
}

function isCategoryItem(c: unknown): c is Category {
  return (
        isObject(c) &&
        isNonEmptyString(c.id) &&
        typeof c.name === "string" &&
        typeof c.icon === "string" &&
        typeof c.color === "string" &&
        isTransactionType(c.type)
  );
}

function isBudgetItem(b: unknown): b is Budget {
  return (
        isObject(b) &&
        isNonEmptyString(b.id) &&
        isValidAmount(b.amount) &&
        (b.categoryId === undefined || isNonEmptyString(b.categoryId))
  );
}

function isRecurringItem(r: unknown): r is RecurringRule {
  return (
        isObject(r) &&
        isNonEmptyString(r.id) &&
        isTransactionType(r.type) &&
        isValidAmount(r.amount) &&
        isNonEmptyString(r.categoryId) &&
        (r.note === undefined || (typeof r.note === "string" && r.note.length <= MAX_IMPORTED_NOTE)) &&
        Number.isInteger(r.dayOfMonth) &&
        (r.dayOfMonth as number) >= 1 &&
        (r.dayOfMonth as number) <= 31 &&
        isValidDateKey(r.startDate) &&
        isValidDateKey(r.lastDate)
  );
}

const arrayOf =
  <T,>(isItem: (v: unknown) => v is T) =>
  (v: unknown): v is T[] =>
    Array.isArray(v) && v.every(isItem);
const isTransactionArray = arrayOf(isTransactionItem);
const isCategoryArray = arrayOf(isCategoryItem);
const isBudgetArray = arrayOf(isBudgetItem);
const isRecurringArray = arrayOf(isRecurringItem);

/**
 * `createdAt` isn't required (older data and hand-edited backups may lack it),
 * but lists sort by it, so a missing one becomes "".
 */
function withTimestamps<T>(item: T): T {
  const o = item as Record<string, unknown>;
  return typeof o.createdAt === "string" ? item : ({ ...o, createdAt: "" } as T);
}

/** Only known settings fields with valid values survive; anything else falls back to the default. */
function sanitizeSettings(v: unknown): Settings | null {
  if (!isObject(v)) return null;
  return {
    theme: typeof v.theme === "string" && THEMES.has(v.theme) ? (v.theme as Settings["theme"]) : DEFAULT_SETTINGS.theme,
    onboarded: typeof v.onboarded === "boolean" ? v.onboarded : true,
    isDemoData: false,
  };
}

/**
 * Validates and imports a backup. Throws InvalidBackupError with a
 * human-readable message on failure. The whole file is checked before
 * anything is written, and the write itself is all-or-nothing, so a bad or
 * partially-fitting backup can never leave the current data half-replaced.
 */
export function importBackup(data: unknown): void {
  if (!isObject(data)) {
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
  if (backup.recurring !== undefined && !isRecurringArray(backup.recurring)) {
    throw new InvalidBackupError(t.errors.invalidRecurringData);
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

  const categories = dedupe(backup.categories).map(withTimestamps);
  const categoryIds = new Set(categories.map((c) => c.id));
  // A category budget whose category isn't in the backup would show up as a
  // second, always-empty "monthly budget" — drop it rather than import junk.
  const budgets = dedupe(backup.budgets ?? []).filter((b) => !b.categoryId || categoryIds.has(b.categoryId));
  const recurring = dedupe(backup.recurring ?? []).filter((r) => categoryIds.has(r.categoryId));
  const settings = sanitizeSettings(backup.settings);

  // Older backups have no repeating operations: importing one replaces the data,
  // so the current rules go too (they'd point at categories that may be gone).
  const entries: Array<[string, unknown]> = [
    [KEYS.categories, categories],
    [KEYS.transactions, dedupe(backup.transactions).map(withTimestamps)],
    [KEYS.budgets, budgets],
    [KEYS.recurring, recurring],
  ];
  if (settings) entries.push([KEYS.settings, settings]);
  writeAllOrNothing(entries);
}

export function clearAllData(): void {
  writeAllOrNothing([
    [KEYS.transactions, []],
    [KEYS.categories, DEFAULT_CATEGORIES],
    [KEYS.budgets, []],
    [KEYS.recurring, []],
    [KEYS.settings, DEFAULT_SETTINGS],
  ]);
}
