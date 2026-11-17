import { act, renderHook } from "@testing-library/react-native";
import { useNow } from "./useNow";

beforeEach(() => jest.useFakeTimers({ now: Date.parse("2026-11-09T20:00:00Z") }));
afterEach(() => jest.useRealTimers());

describe("useNow", () => {
  it("moves forward each minute, so pin colors on an open screen stay right", async () => {
    const { result } = await renderHook(() => useNow());
    const start = result.current;

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    expect(result.current).toBe(start + 60_000);
  });

  it("stops its timer when the screen closes", async () => {
    const clearTimer = jest.spyOn(global, "clearInterval");
    const { unmount } = await renderHook(() => useNow());

    await unmount();

    expect(clearTimer).toHaveBeenCalledTimes(1);
  });
});
