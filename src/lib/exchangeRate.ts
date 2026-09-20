/**
 * Display-only VND -> RUB conversion for the dashboard summary cards.
 *
 * This is intentionally simple: no backend, no heavy currency library, and
 * completely decoupled from how the app stores/calculates money (everything
 * everywhere else stays in VND, always). This module only ever *reads* a
 * rate for on-screen display; nothing here ever feeds back into
 * transactions, budgets, or calculations.
 *
 * Storage: a single, separately-namespaced localStorage key (NOT part of the
 * app's main schema-versioned data), so it's never touched by backup
 * export/import and can't affect that validation in any way.
 */

const CACHE_KEY = "pft:exchangeRate:vndToRub";
const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

// Approximate fallback, used only when we have never successfully fetched a
// live rate before (fresh install, offline). Intentionally rough — this is a
// "≈" display value, not a financial calculation.
const FALLBACK_VND_TO_RUB = 0.0034;

interface RateCache {
  rate: number;
  fetchedAt: string;
}

function readCache(): RateCache | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RateCache>;
    if (typeof parsed.rate !== "number" || !Number.isFinite(parsed.rate) || parsed.rate <= 0) return null;
    if (typeof parsed.fetchedAt !== "string") return null;
    return { rate: parsed.rate, fetchedAt: parsed.fetchedAt };
  } catch {
    return null;
  }
}

function writeCache(cache: RateCache): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full/unavailable — the rate simply won't be cached for next
    // time. Not worth surfacing an error for a purely cosmetic conversion.
  }
}

/** The best rate we have *right now*, without any network access: cached value, or the rough fallback. */
export function getBestKnownRate(): number {
  return readCache()?.rate ?? FALLBACK_VND_TO_RUB;
}

function isCacheFresh(cache: RateCache | null): boolean {
  if (!cache) return false;
  const age = Date.now() - new Date(cache.fetchedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age < REFRESH_INTERVAL_MS;
}

async function fetchRate(): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch("https://open.er-api.com/v6/latest/VND", { signal: controller.signal });
    if (!response.ok) return null;

    const data: unknown = await response.json();
    const rate = (data as { rates?: Record<string, unknown> })?.rates?.RUB;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) return null;

    writeCache({ rate, fetchedAt: new Date().toISOString() });
    return rate;
  } catch {
    // Offline, CORS hiccup, timeout, malformed JSON — all fall back silently
    // to whatever `getBestKnownRate()` already returns.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

let inFlight: Promise<number | null> | null = null;

/**
 * Fetches a fresh rate if the cache is missing/stale, at most once per
 * `REFRESH_INTERVAL_MS` — never polls, never retries in a loop, and never
 * runs more than one request at a time. Resolves to `null` (never rejects)
 * on any failure.
 */
export function refreshRateIfStale(): Promise<number | null> {
  if (inFlight) return inFlight;

  const cache = readCache();
  if (isCacheFresh(cache)) return Promise.resolve(null);

  inFlight = fetchRate().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
