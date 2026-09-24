/**
 * Which list rows should animate when they (re)appear: operations just added
 * (highlight) and operations brought back with "Отменить" (expand). Marks are
 * short-lived and read without being consumed, so a remount (StrictMode, a
 * filter change) within the window behaves the same.
 */

const ADDED_WINDOW_MS = 4_000;
/** Covers the undo toast's lifetime. */
const REMOVED_WINDOW_MS = 12_000;

const added = new Map<string, number>();
const removed = new Map<string, number>();

function isFresh(map: Map<string, number>, id: string, windowMs: number): boolean {
  const at = map.get(id);
  if (at === undefined) return false;
  if (Date.now() - at > windowMs) {
    map.delete(id);
    return false;
  }
  return true;
}

export const rowMotion = {
  markAdded(id: string) {
    added.set(id, Date.now());
  },
  markRemoved(id: string) {
    removed.set(id, Date.now());
  },
  isJustAdded: (id: string) => isFresh(added, id, ADDED_WINDOW_MS),
  /** A removed row that's back (undo) expands into place once, then counts as normal. */
  takeRestored(id: string): boolean {
    if (!isFresh(removed, id, REMOVED_WINDOW_MS)) return false;
    removed.delete(id);
    return true;
  },
  resetForTests() {
    added.clear();
    removed.clear();
  },
};
