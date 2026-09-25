import { useState } from "react";
import { MoreVertical, Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { CategoryFormSheet } from "./CategoryFormSheet";
import { ReassignCategorySheet } from "./ReassignCategorySheet";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../../hooks/useToast";
import type { Category, TransactionType } from "../../types";
import { t } from "../../i18n";

function CategoryRow({
  category,
  onEdit,
  onArchiveToggle,
  onDelete,
}: {
  category: Category;
  onEdit: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-lg">{category.icon}</span>
      <span className="flex-1 truncate text-sm font-medium">
        {category.name}
        {category.isArchived && (
          <span className="ml-2 text-xs font-normal text-neutral-400">{t.categories.archived}</span>
        )}
      </span>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            aria-label={t.categories.optionsFor(category.name)}
            // 28px icon button, 44px touch area (the invisible ::after).
            className="relative rounded-full p-1.5 text-neutral-400 after:absolute after:-inset-2 after:content-[''] hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <MoreVertical size={16} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            className="z-50 min-w-[10rem] rounded-xl border border-neutral-200 bg-white p-1 shadow-lg data-[state=open]:animate-popover-in data-[state=closed]:animate-popover-out dark:border-neutral-800 dark:bg-surface-dark-subtle"
          >
            <DropdownMenu.Item
              onSelect={onEdit}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              <Pencil size={14} /> {t.categories.edit}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={onArchiveToggle}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              {category.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              {category.isArchived ? t.categories.unarchive : t.categories.archive}
            </DropdownMenu.Item>
            {!category.isDefault && (
              <DropdownMenu.Item
                onSelect={onDelete}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-red-600 outline-none hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <Trash2 size={14} /> {t.categories.delete}
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

export function CategoryManager() {
  const { categories, transactions, addCategory, editCategory, archiveCategory, unarchiveCategory, removeCategory, reassignCategory } =
    useAppData();
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [defaultType, setDefaultType] = useState<TransactionType>("expense");
  const [reassignTarget, setReassignTarget] = useState<Category | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  function handleDeleteRequest(category: Category) {
    const used = transactions.some((tx) => tx.categoryId === category.id);
    if (used) {
      setReassignTarget(category);
    } else {
      setConfirmDelete(category);
    }
  }

  return (
    <div className="space-y-4">
      {[
        { title: t.categories.expenseCategories, list: expenseCategories, type: "expense" as TransactionType },
        { title: t.categories.incomeCategories, list: incomeCategories, type: "income" as TransactionType },
      ].map((group) => (
        <Card key={group.title} className="!p-0">
          <div className="flex items-center justify-between px-4 pt-4">
            <h3 className="text-sm font-semibold">{group.title}</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setDefaultType(group.type);
                setFormOpen(true);
              }}
            >
              {t.categories.addCta}
            </Button>
          </div>
          <div className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
            {group.list.map((c) => (
              <CategoryRow
                key={c.id}
                category={c}
                onEdit={() => {
                  setEditing(c);
                  setFormOpen(true);
                }}
                onArchiveToggle={() => (c.isArchived ? unarchiveCategory(c.id) : archiveCategory(c.id))}
                onDelete={() => handleDeleteRequest(c)}
              />
            ))}
          </div>
        </Card>
      ))}

      <CategoryFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
        defaultType={defaultType}
        onSubmit={(input) => {
          if (editing) {
            editCategory(editing.id, input);
            showToast({ message: t.toasts.categoryUpdated });
          } else {
            addCategory(input);
            showToast({ message: t.toasts.categoryCreated });
          }
        }}
      />

      <ReassignCategorySheet
        open={!!reassignTarget}
        onOpenChange={(open) => !open && setReassignTarget(null)}
        category={reassignTarget}
        otherCategories={categories.filter((c) => c.type === reassignTarget?.type && c.id !== reassignTarget?.id && !c.isArchived)}
        transactionCount={transactions.filter((tx) => tx.categoryId === reassignTarget?.id).length}
        onConfirm={(targetId) => {
          if (!reassignTarget) return;
          reassignCategory(reassignTarget.id, targetId);
          removeCategory(reassignTarget.id);
          showToast({ message: t.toasts.transactionsMovedAndCategoryDeleted });
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={confirmDelete ? t.categories.deleteConfirmTitle(confirmDelete.name) : ""}
        description={t.categories.deleteConfirmDescription}
        confirmLabel={t.common.delete}
        onConfirm={() => {
          if (confirmDelete) {
            removeCategory(confirmDelete.id);
            showToast({ message: t.toasts.categoryDeleted });
          }
        }}
      />
    </div>
  );
}
