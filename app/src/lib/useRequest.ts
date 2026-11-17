import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";

/** How long to wait before telling the user the server may be waking up. */
export const SLOW_AFTER_MS = 4_000;

export type RequestStatus = "idle" | "loading" | "slow" | "ready" | "error";

/**
 * Runs a request and tracks its progress. A refresh keeps showing the old data until the new data arrives.
 *
 * @param load - The request to run. Keep it stable with `useCallback`, or null to wait.
 * @param fallbackMessage - What to show if the error has no message of its own.
 */
export function useRequest<T>(load: ((options: { signal: AbortSignal }) => Promise<T>) | null, fallbackMessage: string) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<RequestStatus>(load ? "loading" : "idle");
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const hasData = useRef(false);

  useEffect(() => {
    if (!load) {
      hasData.current = false;
      setData(null);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    const showProgress = !hasData.current;
    if (showProgress) setStatus("loading");
    setError(null);

    const slowTimer = setTimeout(() => {
      if (showProgress) setStatus("slow");
    }, SLOW_AFTER_MS);

    load({ signal: controller.signal })
      .then((loaded) => {
        if (controller.signal.aborted) return;
        hasData.current = true;
        setData(loaded);
        setStatus("ready");
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        setError(caught instanceof ApiError ? caught : new ApiError(fallbackMessage, null));
        setStatus("error");
      })
      .finally(() => clearTimeout(slowTimer));

    return () => {
      clearTimeout(slowTimer);
      controller.abort();
    };
  }, [load, attempt, fallbackMessage]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  return { data, status, error, retry };
}
