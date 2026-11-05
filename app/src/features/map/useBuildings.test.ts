import { act, renderHook } from "@testing-library/react-native";
import { ApiError, type Building } from "@/lib/api";
import { SLOW_AFTER_MS, useBuildings } from "./useBuildings";

const library: Building = { id: 25, name: "Library", latitude: 36.65231, longitude: -121.79614 };

/** A load function the test finishes by hand, so each state can be checked on the way through. */
function controlledLoad() {
  const requests: { resolve: (buildings: Building[]) => void; reject: (error: unknown) => void; signal?: AbortSignal }[] = [];
  const load = jest.fn(
    ({ signal }: { signal?: AbortSignal } = {}) =>
      new Promise<Building[]>((resolve, reject) => {
        requests.push({ resolve, reject, signal });
      }),
  );
  return { load, requests };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("useBuildings", () => {
  it("starts out loading", async () => {
    const { load } = controlledLoad();
    const { result } = await renderHook(() => useBuildings(load));
    expect(result.current.status).toBe("loading");
    expect(result.current.buildings).toEqual([]);
  });

  it("is ready once the buildings arrive", async () => {
    const { load, requests } = controlledLoad();
    const { result } = await renderHook(() => useBuildings(load));

    await act(async () => requests[0].resolve([library]));

    expect(result.current.status).toBe("ready");
    expect(result.current.buildings).toEqual([library]);
  });

  it("reports slow loading, because the free Render plan can take a minute to wake up", async () => {
    const { load } = controlledLoad();
    const { result } = await renderHook(() => useBuildings(load));

    await act(async () => {
      jest.advanceTimersByTime(SLOW_AFTER_MS);
    });

    expect(result.current.status).toBe("slow");
  });

  it("isn't slow if the buildings arrive in time", async () => {
    const { load, requests } = controlledLoad();
    const { result } = await renderHook(() => useBuildings(load));

    await act(async () => requests[0].resolve([library]));
    await act(async () => {
      jest.advanceTimersByTime(SLOW_AFTER_MS);
    });

    expect(result.current.status).toBe("ready");
  });

  it("shows the error message when loading fails", async () => {
    const { load, requests } = controlledLoad();
    const { result } = await renderHook(() => useBuildings(load));

    await act(async () => requests[0].reject(new ApiError("Database is down", 500)));

    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toBe("Database is down");
  });

  it("has a readable message for an unexpected error", async () => {
    const { load, requests } = controlledLoad();
    const { result } = await renderHook(() => useBuildings(load));

    await act(async () => requests[0].reject(new Error("boom")));

    expect(result.current.errorMessage).toBe("Something went wrong loading the buildings.");
  });

  it("can retry after a failure", async () => {
    const { load, requests } = controlledLoad();
    const { result } = await renderHook(() => useBuildings(load));
    await act(async () => requests[0].reject(new ApiError("Down", 503)));

    await act(async () => result.current.retry());
    expect(result.current.status).toBe("loading");
    expect(result.current.errorMessage).toBeNull();

    await act(async () => requests[1].resolve([library]));
    expect(result.current.status).toBe("ready");
    expect(result.current.buildings).toEqual([library]);
  });

  it("cancels the request when the screen goes away", async () => {
    const { load, requests } = controlledLoad();
    const { unmount } = await renderHook(() => useBuildings(load));

    await act(async () => unmount());

    expect(requests[0].signal?.aborted).toBe(true);
  });

  it("ignores the cancelled request instead of reporting it as an error", async () => {
    const { load, requests } = controlledLoad();
    const { result, unmount } = await renderHook(() => useBuildings(load));
    const seen = result.current.status;

    await act(async () => {
      unmount();
      requests[0].reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
    });

    expect(seen).toBe("loading");
    expect(result.current.status).toBe("loading");
  });
});
