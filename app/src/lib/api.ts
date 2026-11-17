import { Platform } from "react-native";
import { tokenStore } from "./tokenStore";

/** A campus building, as described in docs/openapi.yaml. */
export type Building = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
};

/** One invalid field, and the message to show beside it. See docs/error-model.md. */
export type FieldError = {
  field: string;
  message: string;
};

/** Whether someone lost the item or found it. */
export type ListingType = "LOST" | "FOUND";

/** What kind of item a listing is about. */
export type ListingCategory = "PET" | "ELECTRONICS" | "KEYS" | "BOOKS" | "CLOTHING" | "OTHER";

/** A lost or found post, as described in docs/openapi.yaml. */
export type Listing = {
  id: number;
  title: string;
  listingType: ListingType;
  category: ListingCategory;
  status: "ACTIVE" | "RESOLVED";
  description: string | null;
  building: { id: number; name: string };
  floor: number | null;
  /** Null when the listing has no map pin. */
  latitude: number | null;
  longitude: number | null;
  lastSeenAt: string;
  createdAt: string;
  /** Whether the signed-in user posted it. */
  mine: boolean;
};

/** What the app sends to post a listing. */
export type NewListing = {
  title: string;
  listingType: ListingType;
  category: ListingCategory;
  buildingId: number | null;
  floor?: number | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

/** An error with a message that is safe to show the user. */
export class ApiError extends Error {
  /** The HTTP status, or null if no response arrived. */
  readonly status: number | null;
  /** Which fields were invalid, on a 400 for invalid input. */
  readonly fieldErrors: FieldError[];

  constructor(message: string, status: number | null, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
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

type SendOptions = RequestOptions & {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  /** Whether to send the signed-in user's access token. */
  signedIn?: boolean;
};

let onSessionExpired: () => void = () => {};

/** Sets what happens when the API rejects the access token. The session uses this to sign the user out. */
export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

/** Reads the error from an RFC 9457 response. See docs/error-model.md. */
async function problemError(response: Response): Promise<ApiError> {
  try {
    const problem = (await response.json()) as { detail?: string; title?: string; errors?: FieldError[] };
    const message = problem.detail || problem.title || `The server returned an error (${response.status}).`;
    return new ApiError(message, response.status, problem.errors ?? []);
  } catch {
    return new ApiError(`The server returned an error (${response.status}).`, response.status);
  }
}

/** Everything that talks to the API goes through here, so both platforms handle errors the same way. */
async function send<T>(path: string, { signal, timeoutMs = DEFAULT_TIMEOUT_MS, method = "GET", body, signedIn = false }: SendOptions = {}): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel);

  try {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (signedIn) {
      const token = await tokenStore.get();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const url = `${apiBaseUrl(process.env.EXPO_PUBLIC_API_URL, Platform.OS)}${path}`;
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 401 && signedIn) onSessionExpired();
      throw await problemError(response);
    }
    return (response.status === 204 ? undefined : await response.json()) as T;
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
  return send<Building[]>("/api/buildings", options);
}

/**
 * Loads every active listing, newest first.
 *
 * @throws {@link ApiError} with a message to show the user if the request fails.
 */
export function getListings(options?: RequestOptions): Promise<Listing[]> {
  return send<Listing[]>("/api/items", { ...options, signedIn: true });
}

/**
 * Loads one listing.
 *
 * @throws {@link ApiError} with status 404 if it doesn't exist.
 */
export function getListing(id: number, options?: RequestOptions): Promise<Listing> {
  return send<Listing>(`/api/items/${id}`, { ...options, signedIn: true });
}

/**
 * Posts a listing owned by the signed-in user.
 *
 * @throws {@link ApiError} with `fieldErrors` if the API refuses any field.
 */
export function createListing(listing: NewListing, options?: RequestOptions): Promise<Listing> {
  return send<Listing>("/api/items", { ...options, method: "POST", body: listing, signedIn: true });
}

/**
 * Deletes the signed-in user's own listing.
 *
 * @throws {@link ApiError} with status 403 if it belongs to someone else.
 */
export function deleteListing(id: number, options?: RequestOptions): Promise<void> {
  return send<void>(`/api/items/${id}`, { ...options, method: "DELETE", signedIn: true });
}

/**
 * Gets a token for a seeded test account. Only works against compose.e2e.yml, because the route doesn't
 * exist anywhere else. Remove this once real sign-in is in place.
 */
export async function getTestAccountToken(email: string, options?: RequestOptions): Promise<string> {
  const { token } = await send<{ token: string }>(`/test/token?email=${encodeURIComponent(email)}`, { ...options, method: "POST" });
  return token;
}
