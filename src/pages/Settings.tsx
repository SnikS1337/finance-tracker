import { useAppData } from "../hooks/useAppData";
import { CategoryManager } from "../components/categories/CategoryManager";
import { BudgetManager } from "../components/budgets/BudgetManager";
import { ReportGenerator } from "../components/settings/ReportGenerator";
import { DataSettings } from "../components/settings/DataSettings";
import { AppearanceSettings } from "../components/settings/AppearanceSettings";
import { AboutSettings } from "../components/settings/AboutSettings";
import { Card } from "../components/ui/Card";
import { t } from "../i18n";

export default function Settings() {
  const { settings, updateSettings } = useAppData();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t.settings.title}</h1>

      <AppearanceSettings theme={settings.theme} onChange={(theme) => updateSettings({ theme })} />

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          {t.settings.budgetsSection}
        </h2>
        <BudgetManager />
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          {t.settings.categoriesSection}
        </h2>
        <CategoryManager />
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          {t.settings.reportsSection}
        </h2>
        <ReportGenerator />
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          {t.settings.dataSection}
        </h2>
        <DataSettings />
      </section>

      {settings.isDemoData && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm text-amber-800 dark:text-amber-300">{t.settings.demoDataNotice}</p>
        </Card>
      )}

      <AboutSettings />
    </div>
  );
}
