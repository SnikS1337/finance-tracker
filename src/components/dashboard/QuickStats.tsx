import { Card } from "../ui/Card";
import { formatCurrency } from "../../lib/currency";
import { t } from "../../i18n";

interface Props {
  averagePerDay: number;
  medianPerDay: number;
  transactionCount: number;
  spendingDays: number;
}

export function QuickStats({ averagePerDay, medianPerDay, transactionCount, spendingDays }: Props) {
  const items = [
    { label: t.quickStats.averagePerDay, value: formatCurrency(averagePerDay) },
    { label: t.quickStats.medianPerDay, value: formatCurrency(medianPerDay) },
    { label: t.quickStats.transactions, value: String(transactionCount) },
    { label: t.quickStats.spendingDays, value: String(spendingDays) },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5 md:gap-3">
      {items.map((item) => (
        <Card key={item.label} className="!p-3.5">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{item.label}</p>
          <p className="mt-1 truncate text-base font-semibold tabular-nums">{item.value}</p>
        </Card>
      ))}
    </div>
  );
}
