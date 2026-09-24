import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type TouchEvent } from "react";
import { Repeat, Trash2 } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import type { Category, Transaction } from "../../types";
import { formatSignedCurrency } from "../../lib/currency";
import { fromDateKey } from "../../lib/date-utils";
import { cn } from "../../lib/cn";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { AXIS_LOCK_PX, DELETE_THRESHOLD, swipeOffsetForDrag } from "./swipePhysics";
import { rowMotion } from "./rowMotion";
import { canAnimate, EASE_CALM_IN, EASE_CALM_OUT, prefersReducedMotion, vibrate } from "../../lib/motion";
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
/** A deleted row folds away before it leaves the list… */
const COLLAPSE_MS = 220;
/** …and unfolds back into place on "Отменить". */
const EXPAND_MS = 280;
const HIGHLIGHT_MS = 1400;

/**
 * The element that folds/unfolds for a row: the row itself, or the whole day
 * group when it's the day's only operation (so the day header goes with it).
 */
function foldTarget(row: HTMLElement | null, isOnly: boolean): HTMLElement | null {
  if (!row) return null;
  return (isOnly ? row.closest<HTMLElement>("[data-day-group]") : null) ?? row;
}

/** Folds an element to zero height (then calls `done`). Returns the animation, if one runs. */
function collapseElement(el: HTMLElement | null, done: () => void): Animation | null {
  if (!canAnimate(el)) {
    done();
    return null;
  }
  const { height } = el.getBoundingClientRect();
  const marginTop = getComputedStyle(el).marginTop;
  el.style.overflow = "hidden";
  const anim = el.animate(
    [
      { height: `${height}px`, marginTop, opacity: 1 },
      { height: "0px", marginTop: "0px", opacity: 0 },
    ],
    { duration: COLLAPSE_MS, easing: EASE_CALM_IN, fill: "forwards" }
  );
  anim.onfinish = done;
  return anim;
}

function expandElement(el: HTMLElement | null) {
  if (!canAnimate(el)) return;
  const { height } = el.getBoundingClientRect();
  const marginTop = getComputedStyle(el).marginTop;
  const previousOverflow = el.style.overflow;
  el.style.overflow = "hidden";
  const anim = el.animate(
    [
      { height: "0px", marginTop: "0px", opacity: 0 },
      { height: `${height}px`, marginTop, opacity: 1 },
    ],
    { duration: EXPAND_MS, easing: EASE_CALM_OUT }
  );
  anim.onfinish = anim.oncancel = () => {
    el.style.overflow = previousOverflow;
  };
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

/** Rows rendered at first and added each time the end of the list comes near. */
export const LIST_PAGE_SIZE = 100;

interface Props {
  /** Already filtered and sorted; days appear in the order of their first operation. */
  transactions: Transaction[];
  /** Changing it (new filter, period, search, sort) starts again from the first page. */
  resetKey?: string;
  categories: Category[];
  onSelect: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

function SwipeableTransactionRow({
  transaction,
  category,
  isFirst,
  isOnly,
  showDeleteButton,
  onSelect,
  onDelete,
  onRequestDelete,
  registerCollapse,
}: {
  transaction: Transaction;
  category?: Category;
  isFirst: boolean;
  /** The only operation of its day: folding it folds the whole day group. */
  isOnly: boolean;
  showDeleteButton: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onRequestDelete: () => void;
  /** Lets the list fold this row before a delete it confirmed itself (desktop dialog). */
  registerCollapse: (id: string, collapse: ((done: () => void) => void) | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const collapseAnim = useRef<Animation | null>(null);
  const rowRef = useRef<HTMLButtonElement>(null);
  // Offset is kept in a ref and written straight to the DOM: a drag must not
  // re-render React on every touchmove (that's what made it feel laggy), and
  // there's no CSS transition while the finger is down — the row sits exactly
  // under the finger.
  const offset = useRef(0);
  const gesture = useRef({ startX: 0, startY: 0, tracking: false, horizontal: false });
  const animation = useRef<Animation | null>(null);
  const zoneRef = useRef<HTMLSpanElement>(null);
  const zoneFade = useRef<Animation | null>(null);
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
    const armed = x <= -DELETE_THRESHOLD;
    // A light tick when the swipe crosses the delete threshold (where supported).
    if (armed && row.dataset.armed !== "true" && gesture.current.tracking) vibrate(8);
    row.dataset.armed = armed ? "true" : "false";
  };

  // Re-registered every render so the list always calls the current closure.
  useLayoutEffect(() => {
    registerCollapse(transaction.id, collapse);
    return () => registerCollapse(transaction.id, null);
  });

  // Appearing: unfold if it's back from "Отменить", glow briefly if just added.
  useLayoutEffect(() => {
    if (rowMotion.takeRestored(transaction.id)) {
      expandElement(foldTarget(containerRef.current, isOnly));
    } else if (rowMotion.isJustAdded(transaction.id) && canAnimate(highlightRef.current)) {
      highlightRef.current.animate([{ opacity: 1 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], {
        duration: HIGHLIGHT_MS,
        easing: "ease-out",
      });
    }
    // Only on mount: later re-renders of the same row must not replay this.
    // oxlint-disable-next-line react/exhaustive-deps
  }, []);

  const stopAnimation = () => {
    const running = animation.current;
    if (!running) return false;
    const row = rowRef.current;
    const x = row ? currentTranslateX(row) : offset.current;
    running.cancel();
    animation.current = null;
    zoneFade.current?.cancel();
    zoneFade.current = null;
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
    // Returning to rest: the red zone fades out early, so the slow end of the
    // easing doesn't leave a thin red strip at the edge.
    zoneFade.current?.cancel();
    zoneFade.current =
      finalX === 0 && zoneRef.current && typeof zoneRef.current.animate === "function"
        ? zoneRef.current.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: Math.round(duration * 0.45),
            easing: "ease-out",
            fill: "forwards",
          })
        : null;
    anim.onfinish = () => {
      if (animation.current !== anim) return;
      animation.current = null;
      paint(finalX);
      anim.cancel();
      zoneFade.current?.cancel();
      zoneFade.current = null;
      done?.();
    };
  };

  /**
   * Folds the row away, then runs `remove`. Normally the row unmounts right
   * after; if it's still here shortly after (the parent kept it, or the delete
   * failed), it unfolds and slides back instead of staying folded or half-open.
   */
  const collapse = (remove: () => void) => {
    collapseAnim.current = collapseElement(foldTarget(containerRef.current, isOnly), () => {
      try {
        remove();
      } finally {
        window.setTimeout(() => {
          if (!containerRef.current?.isConnected) return;
          collapseAnim.current?.cancel();
          collapseAnim.current = null;
          deleting.current = false;
          if (offset.current !== 0) animateTo([offset.current, 0], null, RETURN_MS, EASE_CALM_OUT);
        }, 400);
      }
    });
  };

  const release = () => {
    const x = offset.current;
    if (onDelete && x <= -DELETE_THRESHOLD) {
      // Delete semantics unchanged (release past the threshold deletes); the
      // row just "lands" first with a few-pixel overshoot and settle.
      deleting.current = true;
      vibrate(15);
      animateTo([x, x - 4, x + 3, x], [0, 0.32, 0.68, 1], SETTLE_MS, "cubic-bezier(0.33, 1, 0.68, 1)", () => {
        // Fold the row away, then delete it.
        collapse(onDelete);
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
      ref={containerRef}
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
        {/* Brief glow for a just-added operation (animated in JS, invisible otherwise). */}
        <span
          ref={highlightRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-sky-500/10 opacity-0 dark:bg-sky-400/15"
        />
        {/* Delete zone rides on the row's trailing edge (it's part of the row,
            not a layer underneath it): at rest it sits fully outside the
            clipped area, so nothing can bleed through as hairlines around the
            row, and while swiping it's revealed seamlessly by the same
            transform. The 1px overlap hides any sub-pixel seam. */}
        <span
          ref={zoneRef}
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

export function TransactionList({ transactions, categories, onSelect, onDelete, resetKey = "" }: Props) {
  // Rendering thousands of rows at once took seconds on a phone ("Этот год"
  // with a few thousand operations). Rows are rendered in pages instead; the
  // next page is added before the end of the list scrolls into view.
  const [visible, setVisible] = useState({ key: resetKey, count: LIST_PAGE_SIZE });
  if (visible.key !== resetKey) setVisible({ key: resetKey, count: LIST_PAGE_SIZE });
  const visibleCount = visible.key === resetKey ? visible.count : LIST_PAGE_SIZE;
  const hasMore = transactions.length > visibleCount;
  const showMore = useCallback(() => setVisible((v) => ({ ...v, count: v.count + LIST_PAGE_SIZE })), []);
  const sentinelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && showMore(), {
      rootMargin: "800px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, visibleCount, showMore]);

  const isTouchPrimary = useIsTouchPrimary();
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const collapsers = useRef(new Map<string, (done: () => void) => void>());
  const registerCollapse = useCallback((id: string, collapse: ((done: () => void) => void) | null) => {
    if (collapse) collapsers.current.set(id, collapse);
    else collapsers.current.delete(id);
  }, []);

  /** Remembers the row so "Отменить" can unfold it back, then deletes. */
  const deleteNow = (tx: Transaction) => {
    rowMotion.markRemoved(tx.id);
    onDelete?.(tx);
  };

  // Days in the order of the (already sorted) list: "Сначала старые" shows the
  // oldest day first. They used to be re-sorted newest-first regardless.
  const groups = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (!groups.has(tx.date)) groups.set(tx.date, []);
    groups.get(tx.date)!.push(tx);
  }
  const sortedDates = [...groups.keys()];
  // Day totals always cover the whole day, even when only part of it is rendered yet.
  let budgetLeft = visibleCount;

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => {
        if (budgetLeft <= 0) return null;
        const dayTransactions = groups.get(date)!;
        const shown = dayTransactions.slice(0, budgetLeft);
        budgetLeft -= shown.length;
        const dayTotal = dayTransactions.reduce(
          (sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount),
          0
        );
        return (
          <div key={date} data-day-group>
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
              {shown.map((tx, i) => (
                <SwipeableTransactionRow
                  key={tx.id}
                  transaction={tx}
                  category={categoryById.get(tx.categoryId)}
                  isFirst={i === 0}
                  isOnly={dayTransactions.length === 1}
                  showDeleteButton={!!onDelete && !isTouchPrimary}
                  onSelect={() => onSelect(tx)}
                  onDelete={onDelete ? () => deleteNow(tx) : undefined}
                  onRequestDelete={() => setPendingDelete(tx)}
                  registerCollapse={registerCollapse}
                />
              ))}
            </div>
          </div>
        );
      })}

      {hasMore && (
        // Also a real button: works without IntersectionObserver and by keyboard.
        <button
          ref={sentinelRef}
          type="button"
          onClick={showMore}
          className="w-full rounded-xl py-3 text-sm font-medium text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/60"
        >
          {t.transactionsPage.showMore(transactions.length - visibleCount)}
        </button>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={t.transactionsPage.deleteConfirmTitle}
        description={t.transactionsPage.deleteConfirmDescription}
        confirmLabel={t.common.delete}
        onConfirm={() => {
          if (!pendingDelete || !onDelete) return;
          const tx = pendingDelete;
          const collapse = collapsers.current.get(tx.id);
          if (collapse) collapse(() => deleteNow(tx));
          else deleteNow(tx);
        }}
      />
    </div>
  );
}
