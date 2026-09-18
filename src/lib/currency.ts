/**
 * Single source of truth for money formatting. VND has no subunit in
 * everyday use, so all amounts are integers — never floating point.
 * Grouping and symbol placement follow Russian conventions (space-separated
 * thousands, symbol after the number) to match the rest of the UI.
 */
export function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const formatted = Math.abs(safe).toLocaleString("ru-RU");
  return `${safe < 0 ? "-" : ""}${formatted} ₫`;
}

/** Signed variant used in transaction lists: "+30 000 000 ₫" / "-250 000 ₫". */
export function formatSignedCurrency(amount: number, type: "income" | "expense"): string {
  const sign = type === "income" ? "+" : "-";
  return `${sign}${formatCurrency(Math.abs(amount))}`;
}

/** Parses raw numeric-input text (may contain thousands separators) into an integer. */
export function parseAmountInput(raw: string): number {
  const digitsOnly = raw.replace(/[^\d]/g, "");
  if (!digitsOnly) return 0;
  return parseInt(digitsOnly, 10);
}

/** Formats a raw numeric string for live display in the amount input, e.g. "250000" -> "250 000". */
export function formatAmountInput(raw: string): string {
  const value = parseAmountInput(raw);
  if (!value) return "";
  return value.toLocaleString("ru-RU");
}
