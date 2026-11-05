import { useCallback, useEffect, useState } from "react";
import { ApiError, type Building, getBuildings } from "@/lib/api";

/** How long to wait before telling the user the server may be waking up. */
export const SLOW_AFTER_MS = 4_000;

type Status = "loading" | "slow" | "ready" | "error";

type LoadBuildings = (options: { signal: AbortSignal }) => Promise<Building[]>;

/**
 * Loads the campus buildings and tracks the request's progress.
 *
 * @param load - How to fetch them. Tests pass their own.
 */
export function useBuildings(load: LoadBuildings = getBuildings) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setErrorMessage(null);

    const slowTimer = setTimeout(() => setStatus("slow"), SLOW_AFTER_MS);

    load({ signal: controller.signal })
      .then((loaded) => {
        if (controller.signal.aborted) return;
        setBuildings(loaded);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setErrorMessage(error instanceof ApiError ? error.message : "Something went wrong loading the buildings.");
        setStatus("error");
      })
      .finally(() => clearTimeout(slowTimer));

    return () => {
      clearTimeout(slowTimer);
      controller.abort();
    };
  }, [load, attempt]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  return { buildings, status, errorMessage, retry };
}
