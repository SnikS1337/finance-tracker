import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { retryFailedChunks } from "../../lib/lazyWithPreload";
import { Button } from "./Button";
import { cn } from "../../lib/cn";
import { t } from "../../i18n";

interface Props {
  children: ReactNode;
  /** "page" fills the content area; "inline" is a compact card for a single widget (e.g. a chart). */
  variant?: "page" | "inline";
  /** Optional title for the inline variant (e.g. the chart's own heading). */
  title?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches a failed lazy chunk (or any render error below it) and shows a calm,
 * recoverable message instead of letting React unmount the whole app — which
 * is what used to leave an empty grey screen when the network dropped.
 *
 * Retrying clears the failed import (see `lazyWithPreload`) and re-renders;
 * it also retries automatically as soon as the browser reports it's back online.
 *
 * Chromium remembers a failed dynamic import for the life of the page: the
 * same chunk URL then fails instantly without touching the network, so a soft
 * retry can't help there. If the error comes back right after a retry while
 * the browser is online, the page is reloaded instead (the route is in the URL
 * and the data in storage, so nothing is lost).
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  private retried = false;

  /** Overridable in tests. */
  static reloadPage = () => window.location.reload();

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error("[ChunkErrorBoundary]", error, info.componentStack);
    if (this.retried && (typeof navigator === "undefined" || navigator.onLine !== false)) {
      ChunkErrorBoundary.reloadPage();
    }
  }

  retry = () => {
    this.retried = true;
    retryFailedChunks();
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return <ChunkErrorFallback variant={this.props.variant ?? "page"} title={this.props.title} onRetry={this.retry} />;
  }
}

function useIsOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

function ChunkErrorFallback({
  variant,
  title,
  onRetry,
}: {
  variant: "page" | "inline";
  title?: string;
  onRetry: () => void;
}) {
  const online = useIsOnline();

  // Coming back online is the most common way out of this state — retry for the user.
  useEffect(() => {
    const handleOnline = () => onRetry();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [onRetry]);

  if (variant === "inline") {
    return (
      <div
        role="alert"
        className="rounded-xl2 border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-surface-dark-subtle"
      >
        {title && <h3 className="mb-3 text-sm font-semibold">{title}</h3>}
        <div className="flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            {!online && <WifiOff size={15} className="shrink-0" aria-hidden="true" />}
            <span>{t.app.chartUnavailable}</span>
          </p>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {t.app.retry}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl2 border border-dashed border-neutral-200 px-6 py-14 text-center",
        "animate-card-in motion-reduce:animate-none dark:border-neutral-800"
      )}
    >
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        {online ? <RefreshCw size={19} aria-hidden="true" /> : <WifiOff size={19} aria-hidden="true" />}
      </span>
      <h2 className="text-base font-semibold">{t.app.chunkErrorTitle}</h2>
      <p className="mt-1.5 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
        {online ? t.app.chunkErrorGeneric : t.app.chunkErrorOffline}
      </p>
      <div className="mt-5">
        <Button onClick={onRetry}>{t.app.retry}</Button>
      </div>
    </div>
  );
}
