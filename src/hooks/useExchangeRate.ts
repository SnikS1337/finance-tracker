import { useEffect, useState } from "react";
import { getBestKnownRate, refreshRateIfStale } from "../lib/exchangeRate";

/**
 * Always returns a valid, usable rate immediately (cached value or the
 * built-in fallback) — never `null`/`NaN`/`undefined` — so the dashboard
 * never has to special-case "no rate yet". If the cache is stale, a refresh
 * is kicked off in the background and the rate updates once (if) it
 * succeeds; offline or failed requests just leave the current rate as-is.
 */
export function useExchangeRate(): number {
  const [rate, setRate] = useState(() => getBestKnownRate());

  useEffect(() => {
    let cancelled = false;
    refreshRateIfStale().then((fresh) => {
      if (!cancelled && fresh) setRate(fresh);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return rate;
}
