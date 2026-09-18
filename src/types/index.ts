export * from "./transaction";
export * from "./category";
export * from "./budget";
export * from "./settings";

import type { Transaction } from "./transaction";
import type { Category } from "./category";
import type { Budget } from "./budget";
import type { Settings } from "./settings";

/** Shape of a full JSON backup export. */
export interface BackupData {
  version: number;
  exportedAt: string;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  settings: Settings;
}
