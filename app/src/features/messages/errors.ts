import { ApiError } from "@/lib/api";

/** The API's own explanation when there is one, which is safe to show, or `fallback` for anything else. */
export function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
