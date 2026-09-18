import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { t } from "../../i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}

export function Sheet({ open, onOpenChange, title, children }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"
        />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl focus:outline-none data-[state=open]:animate-sheet-in-mobile data-[state=closed]:animate-sheet-out-mobile dark:bg-surface-dark-subtle md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:rounded-2xl md:data-[state=open]:animate-sheet-in-desktop md:data-[state=closed]:animate-sheet-out-desktop"
          aria-describedby={undefined}
        >
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700 md:hidden" />
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label={t.common.close}
                className="rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
