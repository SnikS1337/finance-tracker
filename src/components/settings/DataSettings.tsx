import { useRef, useState } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useToast } from "../../hooks/useToast";
import { useAppData } from "../../hooks/useAppData";
import * as storage from "../../lib/storage";
import { saveCSV, saveJSONBackup, readFileAsText } from "../../lib/export";
import { t } from "../../i18n";

export function DataSettings() {
  const { categories, refresh } = useAppData();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmImport, setConfirmImport] = useState<File | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  async function doImport(file: File) {
    try {
      const text = await readFileAsText(file);
      const json = JSON.parse(text);
      storage.importBackup(json);
      refresh();
      showToast({ message: t.toasts.backupImported });
      setImportError(null);
    } catch (err) {
      // Our own errors (invalid backup, storage full) carry a user-facing message;
      // anything else — e.g. a file that isn't JSON at all, whose SyntaxError
      // text is technical English — gets the generic "not a backup" message.
      const ours = err instanceof storage.InvalidBackupError || err instanceof storage.StorageWriteError;
      setImportError(ours ? (err as Error).message : t.errors.notValidBackup);
    }
  }

  return (
    <Card className="space-y-3">
      {/* No card title: the Settings page already heads this section with the same text. */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            const result = await saveJSONBackup(storage.exportBackup());
            if (result !== "cancelled") showToast({ message: t.toasts.backupExported });
          }}
        >
          {t.data.exportJson}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
          {t.data.importJson}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="col-span-2"
          onClick={async () => {
            const result = await saveCSV(storage.getTransactions(), categories);
            if (result !== "cancelled") showToast({ message: t.toasts.csvExported });
          }}
        >
          {t.data.exportCsv}
        </Button>
      </div>

      {/* Destructive action on its own full-width row, visually separated from exports. */}
      <div className="border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <Button variant="danger" size="sm" className="w-full" onClick={() => setConfirmDeleteAll(true)}>
          {t.data.deleteAll}
        </Button>
      </div>

      {importError && <p className="text-sm text-red-600 dark:text-red-400">{importError}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) setConfirmImport(file);
        }}
      />

      <ConfirmDialog
        open={!!confirmImport}
        onOpenChange={(open) => !open && setConfirmImport(null)}
        title={t.data.importConfirmTitle}
        description={t.data.importConfirmDescription}
        confirmLabel={t.data.importConfirmCta}
        onConfirm={() => confirmImport && doImport(confirmImport)}
      />

      <ConfirmDialog
        open={confirmDeleteAll}
        onOpenChange={setConfirmDeleteAll}
        title={t.data.deleteAllConfirmTitle}
        description={t.data.deleteAllConfirmDescription}
        confirmLabel={t.data.deleteAllConfirmCta}
        onConfirm={() => {
          storage.clearAllData();
          refresh();
          showToast({ message: t.toasts.allDataDeleted });
        }}
      />
    </Card>
  );
}
