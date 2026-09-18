import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "./Button";
import { t } from "../../i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = t.common.confirm,
  variant = "danger",
  onConfirm,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm rounded-2xl bg-white p-5 shadow-2xl data-[state=open]:animate-sheet-in-desktop data-[state=closed]:animate-sheet-out-desktop dark:bg-surface-dark-subtle">
          <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {description}
          </Dialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary" size="sm">{t.common.cancel}</Button>
            </Dialog.Close>
            <Button
              variant={variant}
              size="sm"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
