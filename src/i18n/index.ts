import { ru as dateFnsRu } from "date-fns/locale";
import { ru } from "./ru";
import type { Dictionary } from "./types";

/**
 * The active UI locale. Everything user-facing reads strings from here
 * instead of hardcoding text, so the whole app can be retranslated by
 * swapping this one export (or made switchable via a small context/hook
 * later, without touching any component).
 */
export const t: Dictionary = ru;

/** date-fns locale matching `t`, for formatting month/day names correctly. */
export const dateLocale = dateFnsRu;

export type { Dictionary } from "./types";
