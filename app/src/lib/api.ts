import { Platform } from "react-native";

/** A campus building, as described in docs/openapi.yaml. */
export type Building = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
};

/** An error with a message that is safe to show the user. */
export class ApiError extends Error {
  /** The HTTP status, or null if no response arrived. */
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Long enough for the free Render plan to wake up from sleep. See docs/runbook.md. */
const DEFAULT_TIMEOUT_MS = 180_000;

/**
 * Works out the API's address.
 *
 * @param configured - The value of `EXPO_PUBLIC_API_URL`, if set.
 * @param platform - The platform the app is running on.
 * @returns The base URL, with no trailing slash.
 */
export function apiBaseUrl(configured: string | undefined, platform: string): string {
  const trimmed = configured?.trim();
  if (trimmed) return trimmed.replace(/\/+$/, "");
  // On the Android emulator, localhost is the emulator itself. 10.0.2.2 reaches the host machine.
  return platform === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";
}

type RequestOptions = {
  /** Lets the caller cancel the request. */
  signal?: AbortSignal;
  /** How long to wait for a response. */
  timeoutMs?: number;
};

/** Reads the message from an RFC 9457 error response. See docs/error-model.md. */
async function problemMessage(response: Response): Promise<string> {
  try {
    const problem = (await response.json()) as { detail?: string; title?: string };
    return problem.detail || problem.title || `The server returned an error (${response.status}).`;
  } catch {
    return `The server returned an error (${response.status}).`;
  }
}

async function getJson<T>(path: string, { signal, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel);

  try {
    const url = `${apiBaseUrl(process.env.EXPO_PUBLIC_API_URL, Platform.OS)}${path}`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new ApiError(await problemMessage(response), response.status);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timedOut) throw new ApiError("The server took too long to respond. Try again.", null);
    // The caller cancelled on purpose, so this isn't a failure to show anyone.
    if (signal?.aborted) throw error;
    throw new ApiError("Can't reach the server. Check your connection and try again.", null);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}

/**
 * Loads every campus building.
 *
 * @throws {@link ApiError} with a message to show the user if the request fails.
 */
export function getBuildings(options?: RequestOptions): Promise<Building[]> {
  return getJson<Building[]>("/api/buildings", options);
}
