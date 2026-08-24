'use client';

import * as React from 'react';

/**
 * Polls an async fetcher on a fixed interval while the tab is visible.
 * Pauses automatically when document.visibilityState === 'hidden'.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  options: { intervalMs?: number; enabled?: boolean } = {},
): { data: T | null; error: Error | null; refresh: () => void } {
  const { intervalMs = 30_000, enabled = true } = options;
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = React.useCallback((): void => {
    fetcherRef.current()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e : new Error(String(e))));
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = (): void => {
      if (timer !== null) return;
      run();
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') run();
      }, intervalMs);
    };
    const stop = (): void => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') stop();
      else start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs, run]);

  return { data, error, refresh: run };
}
