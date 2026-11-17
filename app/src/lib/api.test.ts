import { ApiError, apiBaseUrl, createListing, deleteListing, getBuildings, getListing, getListings, getTestAccountToken, type NewListing, setSessionExpiredHandler } from "./api";
import { tokenStore } from "./tokenStore";

jest.mock("./tokenStore", () => ({ tokenStore: { get: jest.fn() } }));

const storedToken = tokenStore.get as jest.Mock;

type FakeResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

const respondWith = (status: number, body: unknown): FakeResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  storedToken.mockReset().mockResolvedValue("the-token");
  setSessionExpiredHandler(() => {});
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("apiBaseUrl", () => {
  it("uses the configured URL when there is one", () => {
    expect(apiBaseUrl("https://otterfind-api.example.test", "web")).toBe("https://otterfind-api.example.test");
  });

  it("drops a trailing slash so paths don't get a double slash", () => {
    expect(apiBaseUrl("https://otterfind-api.example.test/", "android")).toBe("https://otterfind-api.example.test");
  });

  it("defaults to localhost on web", () => {
    expect(apiBaseUrl(undefined, "web")).toBe("http://localhost:8080");
  });

  it("defaults to the host machine's address on Android, because localhost there is the emulator itself", () => {
    expect(apiBaseUrl(undefined, "android")).toBe("http://10.0.2.2:8080");
  });

  it("treats a blank value as not configured", () => {
    expect(apiBaseUrl("  ", "web")).toBe("http://localhost:8080");
  });
});

describe("getBuildings", () => {
  it("returns the buildings from the API", async () => {
    const buildings = [{ id: 25, name: "Library", latitude: 36.65231, longitude: -121.79614 }];
    fetchMock.mockResolvedValue(respondWith(200, buildings));

    await expect(getBuildings()).resolves.toEqual(buildings);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/buildings$/);
  });

  it("uses the Problem Details message when the API reports an error", async () => {
    fetchMock.mockResolvedValue(respondWith(500, { title: "Internal Server Error", status: 500, detail: "Database is down" }));

    const error = await getBuildings().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 500, message: "Database is down" });
  });

  it("falls back to the title when a problem has no detail", async () => {
    fetchMock.mockResolvedValue(respondWith(503, { title: "Service Unavailable", status: 503 }));

    await expect(getBuildings()).rejects.toMatchObject({ status: 503, message: "Service Unavailable" });
  });

  it("has a readable message when an error response isn't JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    });

    await expect(getBuildings()).rejects.toMatchObject({ status: 502, message: "The server returned an error (502)." });
  });

  it("explains a network failure instead of exposing the raw error", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));

    await expect(getBuildings()).rejects.toMatchObject({ status: null, message: "Can't reach the server. Check your connection and try again." });
  });

  it("gives up after the timeout", async () => {
    fetchMock.mockImplementation(
      (_url: string, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" })));
        }),
    );

    await expect(getBuildings({ timeoutMs: 5 })).rejects.toMatchObject({
      status: null,
      message: "The server took too long to respond. Try again.",
    });
  });

  it("stays quiet about a request the caller cancelled", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url: string, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" })));
        }),
    );

    const request = getBuildings({ signal: controller.signal });
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("listing requests", () => {
  const request = () => fetchMock.mock.calls[0] as [string, RequestInit];
  const headers = () => request()[1].headers as Record<string, string>;
  const newListing: NewListing = { title: "Grey tabby cat", listingType: "LOST", category: "PET", buildingId: 25 };

  it("sends the access token with every listing request", async () => {
    fetchMock.mockResolvedValue(respondWith(200, []));

    await getListings();

    expect(request()[0]).toMatch(/\/api\/items$/);
    expect(headers().Authorization).toBe("Bearer the-token");
  });

  it("doesn't send a token for public buildings", async () => {
    fetchMock.mockResolvedValue(respondWith(200, []));

    await getBuildings();

    expect(storedToken).not.toHaveBeenCalled();
    expect(headers().Authorization).toBeUndefined();
  });

  it("sends no header at all when no token is saved", async () => {
    storedToken.mockResolvedValue(null);
    fetchMock.mockResolvedValue(respondWith(200, []));

    await getListings();

    expect(headers().Authorization).toBeUndefined();
  });

  it("requests one listing by its ID", async () => {
    fetchMock.mockResolvedValue(respondWith(200, { id: 42 }));

    await expect(getListing(42)).resolves.toEqual({ id: 42 });
    expect(request()[0]).toMatch(/\/api\/items\/42$/);
  });

  it("posts a new listing as JSON", async () => {
    fetchMock.mockResolvedValue(respondWith(201, { id: 42 }));

    await expect(createListing(newListing)).resolves.toEqual({ id: 42 });

    expect(request()[1].method).toBe("POST");
    expect(JSON.parse(request()[1].body as string)).toEqual(newListing);
    expect(headers()["Content-Type"]).toBe("application/json");
  });

  it("keeps the field errors, so the form can show each one beside its field", async () => {
    const errors = [{ field: "title", message: "Title must be at least 4 characters" }];
    fetchMock.mockResolvedValue(respondWith(400, { title: "Bad Request", status: 400, detail: "Some fields are invalid.", errors }));

    await expect(createListing(newListing)).rejects.toMatchObject({ status: 400, fieldErrors: errors });
  });

  it("has no field errors on other failures", async () => {
    fetchMock.mockResolvedValue(respondWith(500, { title: "Internal Server Error", status: 500 }));

    await expect(createListing(newListing)).rejects.toMatchObject({ status: 500, fieldErrors: [] });
  });

  it("deletes a listing and expects no body back", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error("No body"); } });

    await expect(deleteListing(42)).resolves.toBeUndefined();
    expect(request()[1].method).toBe("DELETE");
  });

  it("reports an expired session when the API rejects the token", async () => {
    const expired = jest.fn();
    setSessionExpiredHandler(expired);
    fetchMock.mockResolvedValue(respondWith(401, { title: "Unauthorized", status: 401 }));

    await expect(getListings()).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("doesn't end the session on other errors", async () => {
    const expired = jest.fn();
    setSessionExpiredHandler(expired);
    fetchMock.mockResolvedValue(respondWith(403, { title: "Forbidden", status: 403 }));

    await expect(deleteListing(42)).rejects.toMatchObject({ status: 403 });
    expect(expired).not.toHaveBeenCalled();
  });

  it("asks for a test account's token without sending one", async () => {
    fetchMock.mockResolvedValue(respondWith(200, { token: "minted" }));

    await expect(getTestAccountToken("e2e-user@example.test")).resolves.toBe("minted");

    expect(request()[0]).toMatch(/\/test\/token\?email=e2e-user%40example\.test$/);
    expect(headers().Authorization).toBeUndefined();
  });
});
