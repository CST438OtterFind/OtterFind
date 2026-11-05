import { ApiError, apiBaseUrl, getBuildings } from "./api";

type FakeResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

const respondWith = (status: number, body: unknown): FakeResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
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
