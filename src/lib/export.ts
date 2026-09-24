import type { BackupData, Transaction, Category } from "../types";
import { toDateKey, type DateRange } from "./date-utils";
import { t } from "../i18n";

/** How a file left the app: saved/downloaded, handed to the share sheet, or the user backed out. */
export type SaveResult = "downloaded" | "shared" | "cancelled";

// Blob URLs are revoked only after the browser has had time to start the
// download; revoking right after click() made some browsers (notably Safari)
// drop the download.
const REVOKE_DELAY_MS = 60_000;

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

/** Phones and tablets, where the share sheet ("Save to Files", AirDrop, messengers) is the natural way to save. */
function isTouchPrimary(): boolean {
  return typeof window !== "undefined" && (window.matchMedia?.("(hover: none) and (pointer: coarse)").matches ?? false);
}

/**
 * Saves a generated file. On touch devices that can share files (feature
 * detection via `navigator.canShare({ files })`) it opens the system share
 * sheet — the reliable way to save on iOS, where `<a download>` is flaky,
 * especially in the installed app. Everywhere else, or if sharing isn't
 * possible, it falls back to a normal download.
 */
export async function saveFile(blob: Blob, filename: string): Promise<SaveResult> {
  if (
    isTouchPrimary() &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    typeof File === "function"
  ) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return "shared";
      } catch (err) {
        // The user closed the share sheet: respect that, don't force a download.
        if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
        // Anything else (e.g. NotAllowedError when the tap was too long ago):
        // fall through to a regular download.
      }
    }
  }
  downloadBlob(blob, filename);
  return "downloaded";
}

/** "yyyy-MM-dd" of today, for file names. */
function fileDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function saveJSONBackup(backup: BackupData): Promise<SaveResult> {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  return saveFile(blob, `finance-backup-${fileDate()}.json`);
}

/** Separator Excel expects with Russian regional settings (a comma puts every row into one column). */
export const CSV_SEPARATOR = ";";

function csvEscape(value: string): string {
  if (/[";\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** CSV text (with a UTF-8 BOM) for the given transactions, oldest first. */
export function buildCSV(transactions: Transaction[], categories: Category[]): string {
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const header = [t.csv.date, t.csv.type, t.csv.amount, t.csv.category, t.csv.note].join(CSV_SEPARATOR);
  const typeLabel = (type: Transaction["type"]) => (type === "income" ? t.csv.income : t.csv.expense);
  const rows = transactions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((tx) =>
      [tx.date, typeLabel(tx.type), String(tx.amount), categoryName.get(tx.categoryId) ?? t.csv.unknown, tx.note ?? ""]
        .map(csvEscape)
        .join(CSV_SEPARATOR)
    );
  // Leading BOM so Excel opens the Cyrillic content as UTF-8 instead of guessing wrong;
  // CRLF line endings are what Excel writes and reads most reliably.
  return "﻿" + [header, ...rows].join("\r\n");
}

export function saveCSV(transactions: Transaction[], categories: Category[]): Promise<SaveResult> {
  const blob = new Blob([buildCSV(transactions, categories)], { type: "text/csv;charset=utf-8" });
  return saveFile(blob, `transactions-${fileDate()}.csv`);
}

/**
 * File name for a PNG report that says which period it covers:
 * a calendar month → `report-2026-09.png`, a year → `report-2026.png`,
 * a single day → `report-2026-09-24.png`, anything else → `report-2026-09-01_2026-09-24.png`.
 */
export function reportFileName(range: DateRange): string {
  const start = toDateKey(range.start);
  const end = toDateKey(range.end);
  const lastDayOfMonth = toDateKey(new Date(range.start.getFullYear(), range.start.getMonth() + 1, 0));
  let label: string;
  if (start === end) label = start;
  else if (start.endsWith("-01-01") && end === `${start.slice(0, 4)}-12-31`) label = start.slice(0, 4);
  else if (start.endsWith("-01") && end === lastDayOfMonth) label = start.slice(0, 7);
  else label = `${start}_${end}`;
  return `report-${label}.png`;
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(t.data.importGenericError));
    reader.readAsText(file);
  });
}
