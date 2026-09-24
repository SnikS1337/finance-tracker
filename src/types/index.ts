export * from "./transaction";
export * from "./category";
export * from "./budget";
export * from "./settings";
export * from "./recurring";

import type { Transaction } from "./transaction";
import type { Category } from "./category";
import type { Budget } from "./budget";
import type { Settings } from "./settings";
import type { RecurringRule } from "./recurring";

/** Shape of a full JSON backup export. */
export interface BackupData {
  version: number;
  exportedAt: string;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  settings: Settings;
  /** Added after v1.0; optional so older backups still import. */
  recurring?: RecurringRule[];
}
