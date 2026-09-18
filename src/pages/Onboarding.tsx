import { Wallet } from "lucide-react";
import { Button } from "../components/ui/Button";
import { useAppData } from "../hooks/useAppData";
import * as storage from "../lib/storage";
import { buildDemoData } from "../lib/seed";
import { t } from "../i18n";

export default function Onboarding() {
  const { updateSettings, refresh } = useAppData();

  function startWithDemoData() {
    const { transactions, budgets } = buildDemoData();
    storage.saveTransactions(transactions);
    storage.saveBudgets(budgets);
    updateSettings({ onboarded: true, isDemoData: true });
    refresh();
  }

  function startFresh() {
    updateSettings({ onboarded: true, isDemoData: false });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
        <Wallet size={30} />
      </div>
      <h1 className="text-2xl font-semibold">{t.onboarding.title}</h1>
      <p className="mt-2 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">{t.onboarding.subtitle}</p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Button onClick={startWithDemoData}>{t.onboarding.exploreDemo}</Button>
        <Button variant="secondary" onClick={startFresh}>
          {t.onboarding.startFresh}
        </Button>
      </div>
    </div>
  );
}
