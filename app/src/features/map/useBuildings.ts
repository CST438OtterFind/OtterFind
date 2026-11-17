import { type Building, getBuildings } from "@/lib/api";
import { useRequest } from "@/lib/useRequest";

export { SLOW_AFTER_MS } from "@/lib/useRequest";

type LoadBuildings = (options: { signal: AbortSignal }) => Promise<Building[]>;

/**
 * Loads the campus buildings and tracks the request's progress.
 *
 * @param load - How to fetch them. Tests pass their own.
 */
export function useBuildings(load: LoadBuildings = getBuildings) {
  const { data, status, error, retry } = useRequest(load, "Something went wrong loading the buildings.");
  return {
    buildings: data ?? [],
    status: status === "idle" ? ("loading" as const) : status,
    errorMessage: error?.message ?? null,
    retry,
  };
}
