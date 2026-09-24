import { useSyncExternalStore } from "react";

/**
 * "A new version is ready" state, shared between the service-worker
 * registration (outside React) and the update banner.
 */

type Apply = () => Promise<void> | void;

let applyUpdate: Apply | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

/** Called by the service-worker registration when a new version is waiting. */
export function markUpdateAvailable(apply: Apply): void {
  applyUpdate = apply;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => applyUpdate !== null;

/** True once a new version has been downloaded and is waiting to be activated. */
export function useUpdateAvailable(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Fallback reload if the new service worker doesn't take over by itself. */
const RELOAD_FALLBACK_MS = 3_000;

/**
 * Activates the waiting version. The page reloads when the new service worker
 * takes control; if that doesn't happen (e.g. the browser keeps the old one
 * around), reload anyway after a short wait so the tap is never a no-op.
 */
let fallbackTimer: number | undefined;

export async function applyAppUpdate(reload: () => void = () => window.location.reload()): Promise<void> {
  const apply = applyUpdate;
  window.clearTimeout(fallbackTimer);
  fallbackTimer = window.setTimeout(reload, RELOAD_FALLBACK_MS);
  try {
    await apply?.();
  } catch {
    window.clearTimeout(fallbackTimer);
    reload();
  }
}

/** Test-only reset. */
export function resetAppUpdateForTests(): void {
  window.clearTimeout(fallbackTimer);
  applyUpdate = null;
  emit();
}
