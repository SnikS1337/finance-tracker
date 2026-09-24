import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function Card({ className, onClick, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-card-in [animation-delay:var(--stagger,0ms)] rounded-xl2 border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-surface-dark-subtle",
        // Only clickable cards get interaction feedback — a static card lifting on
        // hover for no reason would read as a mistake, not polish.
        onClick && "transition-[transform,box-shadow] duration-200 ease-calm-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:duration-75",
        className
      )}
      onClick={onClick}
      {...props}
    />
  );
}
