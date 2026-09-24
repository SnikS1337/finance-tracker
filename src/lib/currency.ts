/**
 * Single source of truth for money formatting. VND has no subunit in
 * everyday use, so all amounts are integers — never floating point.
 * Grouping and symbol placement follow Russian conventions (space-separated
 * thousands, symbol after the number) to match the rest of the UI.
 */
// One shared formatter instead of `toLocaleString("ru-RU")` per call, which
// builds a new formatter every time — noticeable with long lists and charts.
const groupFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

/** Whole number with Russian digit grouping ("1 234 567", non-breaking spaces). */
export function formatGrouped(value: number): string {
  return groupFormatter.format(value);
}

export function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const formatted = formatGrouped(Math.abs(safe));
  // Non-breaking space: the ₫ sign never wraps onto its own line.
  return `${safe < 0 ? "-" : ""}${formatted}\u00A0₫`;
}

/** Signed variant used in transaction lists: "+30 000 000 ₫" / "-250 000 ₫". */
export function formatSignedCurrency(amount: number, type: "income" | "expense"): string {
  const sign = type === "income" ? "+" : "-";
  return `${sign}${formatCurrency(Math.abs(amount))}`;
}

/**
 * Largest amount the app accepts: 999 999 999 999 ₫ (12 digits, ≈ 3–4 bn ₽).
 * Far above any personal transaction, and well inside Number.MAX_SAFE_INTEGER,
 * so sums of many such amounts stay exact and backups always re-import.
 */
export const MAX_AMOUNT = 999_999_999_999;
const MAX_AMOUNT_DIGITS = String(MAX_AMOUNT).length;

/** A storable amount: a positive whole number of ₫ no larger than MAX_AMOUNT. */
export function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= MAX_AMOUNT;
}

/**
 * Parses raw numeric-input text (may contain thousands separators) into an
 * integer. Extra digits beyond MAX_AMOUNT's length are ignored, so the input
 * simply stops growing instead of producing an unsafe/unstorable number.
 */
export function parseAmountInput(raw: string): number {
  const digitsOnly = raw.replace(/[^\d]/g, "").replace(/^0+/, "").slice(0, MAX_AMOUNT_DIGITS);
  if (!digitsOnly) return 0;
  return parseInt(digitsOnly, 10);
}

/** Formats a raw numeric string for live display in the amount input, e.g. "250000" -> "250 000". */
export function formatAmountInput(raw: string): string {
  const value = parseAmountInput(raw);
  if (!value) return "";
  return formatGrouped(value);
}

/**
 * Rough "≈" display-only equivalent in RUB, e.g. "≈ 92 000 ₽". Never used for
 * anything but on-screen display — VND stays the only currency actually
 * stored or calculated with.
 */
export function formatRubEquivalent(vndAmount: number, vndToRubRate: number): string {
  const safeAmount = Number.isFinite(vndAmount) ? vndAmount : 0;
  const safeRate = Number.isFinite(vndToRubRate) && vndToRubRate > 0 ? vndToRubRate : 0;
  const rubles = Math.round(Math.abs(safeAmount) * safeRate);
  return `≈ ${formatGrouped(rubles)} ₽`;
}
