import { useRef, useState, useSyncExternalStore, type TouchEvent } from "react";
import { Repeat, Trash2 } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import type { Category, Transaction } from "../../types";
import { formatSignedCurrency } from "../../lib/currency";
import { fromDateKey } from "../../lib/date-utils";
import { cn } from "../../lib/cn";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { AXIS_LOCK_PX, DELETE_THRESHOLD, swipeOffsetForDrag } from "./swipePhysics";
import { t, dateLocale } from "../../i18n";

function groupLabel(dateKey: string): string {
  const d = fromDateKey(dateKey);
  if (isToday(d)) return t.common.today;
  if (isYesterday(d)) return t.common.yesterday;
  return format(d, "EEEE, d MMM yyyy", { locale: dateLocale });
}

// ---------------------------------------------------------------------------
// Release animations
// ---------------------------------------------------------------------------

const RETURN_MS = 300;
const SETTLE_MS = 240;
const EASE_CALM_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
}

function transformFor(x: number): string {
  return x === 0 ? "" : `translate3d(${x}px, 0, 0)`;
}

/** Current rendered translateX of an element (mid-animation included). */
function currentTranslateX(el: HTMLElement): number {
  const value = getComputedStyle(el).transform;
  if (!value || value === "none") return 0;
  const match = value.match(/matrix(?:3d)?\(([^)]+)\)/);
  if (!match) return 0;
  const parts = match[1].split(",").map((p) => parseFloat(p));
  const x = parts.length === 16 ? parts[12] : parts[4];
  return Number.isFinite(x) ? x : 0;
}

// ---------------------------------------------------------------------------
// Input capability
// ---------------------------------------------------------------------------

const TOUCH_PRIMARY_QUERY = "(hover: none) and (pointer: coarse)";

function subscribeTouchPrimary(onChange: () => void) {
  const mql = typeof window !== "undefined" ? window.matchMedia?.(TOUCH_PRIMARY_QUERY) : undefined;
  if (!mql) return () => {};
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getTouchPrimary() {
  return typeof window !== "undefined" && (window.matchMedia?.(TOUCH_PRIMARY_QUERY).matches ?? false);
}

/** Touch-first devices delete by swiping; mouse/trackpad devices get a hover delete button. */
function useIsTouchPrimary() {
  return useSyncExternalStore(subscribeTouchPrimary, getTouchPrimary, () => false);
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

interface Props {
  transactions: Transaction[];
  categories: Category[];
  onSelect: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

function SwipeableTransactionRow({
  transaction,
  category,
  isFirst,
  showDeleteButton,
  onSelect,
  onDelete,
  onRequestDelete,
}: {
  transaction: Transaction;
  category?: Category;
  isFirst: boolean;
  showDeleteButton: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onRequestDelete: () => void;
}) {
  const rowRef = useRef<HTMLButtonElement>(null);
  // Offset is kept in a ref and written straight to the DOM: a drag must not
  // re-render React on every touchmove (that's what made it feel laggy), and
  // there's no CSS transition while the finger is down — the row sits exactly
  // under the finger.
  const offset = useRef(0);
  const gesture = useRef({ startX: 0, startY: 0, tracking: false, horizontal: false });
  const animation = useRef<Animation | null>(null);
  const deleting = useRef(false);
  // True when the current touch sequence was a real horizontal drag (or
  // interrupted a running animation), so the click the browser may synthesize
  // after touchend doesn't also open the transaction for editing. Reset at the
  // start of every new touch, so a swipe that produced no click can't swallow
  // the *next* genuine tap.
  const wasDragging = useRef(false);

  const paint = (x: number) => {
    offset.current = x;
    const row = rowRef.current;
    if (!row) return;
    row.style.transform = transformFor(x);
    row.dataset.swiping = x < 0 ? "true" : "false";
    row.dataset.armed = x <= -DELETE_THRESHOLD ? "true" : "false";
  };

  const stopAnimation = () => {
    const running = animation.current;
    if (!running) return false;
    const row = rowRef.current;
    const x = row ? currentTranslateX(row) : offset.current;
    running.cancel();
    animation.current = null;
    paint(x);
    return true;
  };

  /** Plays keyframes (translateX values) and leaves the row at the last one. */
  const animateTo = (frames: number[], offsets: number[] | null, duration: number, easing: string, done?: () => void) => {
    const row = rowRef.current;
    const finalX = frames[frames.length - 1];
    if (!row || typeof row.animate !== "function" || prefersReducedMotion()) {
      paint(finalX);
      done?.();
      return;
    }
    // Multi-step (settle) animations ease each segment; a simple return eases the whole run.
    const keyframes = frames.map((x, i) => ({
      transform: x === 0 ? "translate3d(0, 0, 0)" : `translate3d(${x}px, 0, 0)`,
      ...(offsets ? { offset: offsets[i], easing } : {}),
    }));
    // The zone stays visible for the whole animation; paint(finalX) below hides it at 0.
    row.dataset.swiping = "true";
    const anim = row.animate(keyframes, { duration, easing: offsets ? "linear" : easing });
    animation.current = anim;
    anim.onfinish = () => {
      if (animation.current !== anim) return;
      animation.current = null;
      paint(finalX);
      anim.cancel();
      done?.();
    };
  };

  const release = () => {
    const x = offset.current;
    if (onDelete && x <= -DELETE_THRESHOLD) {
      // Delete semantics unchanged (release past the threshold deletes); the
      // row just "lands" first with a few-pixel overshoot and settle.
      deleting.current = true;
      animateTo([x, x - 4, x + 3, x], [0, 0.32, 0.68, 1], SETTLE_MS, "cubic-bezier(0.33, 1, 0.68, 1)", () => {
        onDelete();
        // Normally the row unmounts right after onDelete. If it's still here
        // (the parent kept it), don't leave it stuck half-open.
        window.setTimeout(() => {
          if (!rowRef.current?.isConnected) return;
          deleting.current = false;
          animateTo([offset.current, 0], null, RETURN_MS, EASE_CALM_OUT);
        }, 400);
      });
      return;
    }
    if (x !== 0) animateTo([x, 0], null, RETURN_MS, EASE_CALM_OUT);
  };

  const handleTouchStart = (e: TouchEvent<HTMLButtonElement>) => {
    if (deleting.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const interrupted = stopAnimation();
    wasDragging.current = interrupted;
    // Continue from wherever the row currently is (e.g. mid-return).
    gesture.current = {
      startX: touch.clientX - offset.current,
      startY: touch.clientY,
      tracking: true,
      horizontal: false,
    };
  };

  const handleTouchMove = (e: TouchEvent<HTMLButtonElement>) => {
    const g = gesture.current;
    if (!g.tracking || deleting.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = touch.clientX - g.startX;
    const dy = touch.clientY - g.startY;
    if (!g.horizontal && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > AXIS_LOCK_PX) {
      // Vertical scroll: let the page have it, and put the row back if it moved.
      g.tracking = false;
      if (offset.current !== 0) animateTo([offset.current, 0], null, RETURN_MS, EASE_CALM_OUT);
      return;
    }
    if (Math.abs(dx) > AXIS_LOCK_PX) g.horizontal = true;
    if (g.horizontal) {
      wasDragging.current = true;
      paint(swipeOffsetForDrag(dx));
    }
  };

  const handleTouchEnd = () => {
    const g = gesture.current;
    if (!g.tracking || deleting.current) return;
    g.tracking = false;
    g.horizontal = false;
    release();
  };

  const handleTouchCancel = () => {
    const g = gesture.current;
    if (!g.tracking || deleting.current) return;
    g.tracking = false;
    g.horizontal = false;
    if (offset.current !== 0) animateTo([offset.current, 0], null, RETURN_MS, EASE_CALM_OUT);
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden",
        !isFirst && "border-t border-neutral-100 dark:border-neutral-800"
      )}
    >
      <button
        ref={rowRef}
        type="button"
        data-swiping="false"
        data-armed="false"
        onClick={() => {
          if (wasDragging.current) {
            wasDragging.current = false;
            return;
          }
          if (deleting.current || offset.current !== 0) return;
          onSelect();
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        className={cn(
          "group/row relative flex w-full items-center gap-3 bg-white px-4 py-3 text-left transition-colors duration-150",
          "hover:bg-neutral-50 active:bg-neutral-50 dark:bg-surface-dark-subtle dark:hover:bg-neutral-800/60 dark:active:bg-neutral-800/60",
          showDeleteButton && "pr-14"
        )}
        style={{ touchAction: "pan-y" }}
      >
        {/* Delete zone rides on the row's trailing edge (it's part of the row,
            not a layer underneath it): at rest it sits fully outside the
            clipped area, so nothing can bleed through as hairlines around the
            row, and while swiping it's revealed seamlessly by the same
            transform. The 1px overlap hides any sub-pixel seam. */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 left-[calc(100%-1px)] flex w-40 items-center bg-red-500 text-white",
            "opacity-0 group-data-[swiping=true]/row:opacity-100"
          )}
        >
          <span
            className={cn(
              "flex w-[73px] items-center justify-center transition-transform duration-150 ease-calm-out",
              "scale-90 group-data-[armed=true]/row:scale-110"
            )}
          >
            <Trash2 size={18} strokeWidth={1.9} />
          </span>
        </span>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
          style={{ backgroundColor: (category?.color ?? "#999") + "22" }}
        >
          {category?.icon ?? "❓"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium">{category?.name ?? t.common.unknownCategory}</span>
            {transaction.recurringId && (
              <Repeat
                size={12}
                strokeWidth={2}
                className="shrink-0 text-neutral-400"
                aria-label={t.transactionsPage.recurringBadge}
              />
            )}
          </span>
          {transaction.note && (
            <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{transaction.note}</span>
          )}
        </span>
        <span
          className={cn(
            "shrink-0 text-sm font-semibold tabular-nums",
            transaction.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-900 dark:text-neutral-100"
          )}
        >
          {formatSignedCurrency(transaction.amount, transaction.type)}
        </span>
      </button>

      {showDeleteButton && (
        <button
          type="button"
          onClick={onRequestDelete}
          aria-label={t.transactionsPage.deleteAction}
          title={t.transactionsPage.deleteAction}
          className={cn(
            "absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400",
            "opacity-0 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600",
            "focus-visible:opacity-100 group-hover:opacity-100 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          )}
        >
          <Trash2 size={16} strokeWidth={1.9} />
        </button>
      )}
    </div>
  );
}

export function TransactionList({ transactions, categories, onSelect, onDelete }: Props) {
  const isTouchPrimary = useIsTouchPrimary();
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const groups = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (!groups.has(tx.date)) groups.set(tx.date, []);
    groups.get(tx.date)!.push(tx);
  }
  const sortedDates = [...groups.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => {
        const dayTransactions = groups.get(date)!;
        const dayTotal = dayTransactions.reduce(
          (sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount),
          0
        );
        return (
          <div key={date}>
            {/* Sticky day header: stays visible while scrolling through a long day.
                Its background matches the page so rows slide underneath cleanly. */}
            <div className="sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-1 mb-1 flex items-center justify-between bg-surface-subtle/95 px-2 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-surface-subtle/80 dark:bg-surface-dark/95 dark:supports-[backdrop-filter]:bg-surface-dark/80">
              <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{groupLabel(date)}</h3>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {formatSignedCurrency(Math.abs(dayTotal), dayTotal >= 0 ? "income" : "expense")}
              </span>
            </div>
            {/* translateZ(0) makes Safari honour the rounded clip for the
                transformed rows inside (otherwise square red corners can poke out). */}
            <div className="overflow-hidden rounded-xl2 border border-neutral-200 bg-white [transform:translateZ(0)] dark:border-neutral-800 dark:bg-surface-dark-subtle">
              {dayTransactions.map((tx, i) => (
                <SwipeableTransactionRow
                  key={tx.id}
                  transaction={tx}
                  category={categoryById.get(tx.categoryId)}
                  isFirst={i === 0}
                  showDeleteButton={!!onDelete && !isTouchPrimary}
                  onSelect={() => onSelect(tx)}
                  onDelete={onDelete ? () => onDelete(tx) : undefined}
                  onRequestDelete={() => setPendingDelete(tx)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={t.transactionsPage.deleteConfirmTitle}
        description={t.transactionsPage.deleteConfirmDescription}
        confirmLabel={t.common.delete}
        onConfirm={() => {
          if (pendingDelete && onDelete) onDelete(pendingDelete);
        }}
      />
    </div>
  );
}
