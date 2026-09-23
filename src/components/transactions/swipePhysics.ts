// Swipe-to-delete drag physics (kept out of the component file so it can be unit-tested directly).

/** Release at or past this many px (leftwards) deletes. Unchanged from before. */
export const DELETE_THRESHOLD = 72;
/** Past the threshold the row can travel at most this much further, asymptotically. */
const RESISTANCE_RANGE = 28;
/** Slope right after the threshold (1 = no resistance). Decreases smoothly from here. */
const RESISTANCE_START = 0.55;
/** Finger travel needed before a gesture is committed to an axis. */
export const AXIS_LOCK_PX = 8;

/**
 * Maps raw finger travel to row offset: 1:1 up to the delete threshold (no
 * rubber-banding while the user is still deciding), then a soft, increasing
 * resistance that never quite reaches THRESHOLD + RESISTANCE_RANGE.
 */
export function swipeOffsetForDrag(dx: number): number {
  const pull = Math.max(0, -dx);
  if (pull <= DELETE_THRESHOLD) return pull === 0 ? 0 : -pull;
  const over = pull - DELETE_THRESHOLD;
  const extra = RESISTANCE_RANGE * (1 - 1 / ((over * RESISTANCE_START) / RESISTANCE_RANGE + 1));
  return -(DELETE_THRESHOLD + extra);
}
