import { Card } from "../ui/Card";
import { AnimatedNumber } from "../ui/AnimatedNumber";
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
    { label: t.quickStats.averagePerDay, value: averagePerDay, format: formatCurrency },
    { label: t.quickStats.medianPerDay, value: medianPerDay, format: formatCurrency },
    { label: t.quickStats.transactions, value: transactionCount, format: String },
    { label: t.quickStats.spendingDays, value: spendingDays, format: String },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5 md:gap-3">
      {items.map((item) => (
        <Card key={item.label} className="!p-3.5">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{item.label}</p>
          <p className="mt-1 truncate text-base font-semibold tabular-nums">
            <AnimatedNumber value={item.value} format={item.format} />
          </p>
        </Card>
      ))}
    </div>
  );
}
