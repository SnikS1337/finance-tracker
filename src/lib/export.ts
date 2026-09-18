import type { BackupData, Transaction, Category } from "../types";
import { t } from "../i18n";

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJSONBackup(backup: BackupData): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadBlob(JSON.stringify(backup, null, 2), `finance-backup-${dateStr}.json`, "application/json");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function downloadCSV(transactions: Transaction[], categories: Category[]): void {
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const header = [t.csv.date, t.csv.type, t.csv.amount, t.csv.category].join(",");
  const typeLabel = (type: Transaction["type"]) => (type === "income" ? t.csv.income : t.csv.expense);
  const rows = transactions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((tx) =>
      [tx.date, typeLabel(tx.type), String(tx.amount), categoryName.get(tx.categoryId) ?? t.csv.unknown]
        .map(csvEscape)
        .join(",")
    );
  // Leading BOM so Excel opens the Cyrillic content as UTF-8 instead of guessing wrong.
  const csv = "\ufeff" + [header, ...rows].join("\n");
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadBlob(csv, `transactions-${dateStr}.csv`, "text/csv");
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(t.data.importGenericError));
    reader.readAsText(file);
  });
}
