import type { TransactionType } from "./transaction";

export interface Category {
  id: string;
  name: string;
  /** Emoji icon, e.g. "🍜" */
  icon: string;
  /** Hex color used consistently across charts/lists for this category. */
  color: string;
  type: TransactionType;
  isDefault?: boolean;
  isArchived?: boolean;
  createdAt: string;
}

export type NewCategoryInput = Pick<Category, "name" | "icon" | "color" | "type">;
