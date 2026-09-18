import { Card } from "../ui/Card";
import { t } from "../../i18n";

export function AboutSettings() {
  return (
    <Card>
      <h3 className="mb-2 text-sm font-semibold">{t.settings.about}</h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.settings.aboutBody}</p>
      <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">{t.settings.version}</p>
    </Card>
  );
}
