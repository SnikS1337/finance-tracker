import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-neutral-200 px-6 py-14 text-center dark:border-neutral-800">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
