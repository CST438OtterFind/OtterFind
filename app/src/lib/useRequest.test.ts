import { act, renderHook } from "@testing-library/react-native";
import { ApiError } from "./api";
import { useRequest } from "./useRequest";

describe("useRequest", () => {
  it("keeps showing the old data during a refresh, so the list doesn't flash", async () => {
    let finish: (value: string) => void = () => {};
    const load = jest.fn().mockResolvedValueOnce("old").mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const { result } = await renderHook(() => useRequest(load, "Failed"));
    expect(result.current.data).toBe("old");

    await act(async () => result.current.retry());
    expect(result.current.status).toBe("ready");
    expect(result.current.data).toBe("old");

    await act(async () => finish("new"));
    expect(result.current.data).toBe("new");
  });

  it("uses the fallback message for an error that isn't from the API", async () => {
    const load = jest.fn().mockRejectedValue(new TypeError("bug"));
    const { result } = await renderHook(() => useRequest(load, "Failed"));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.message).toBe("Failed");
  });

  it("clears its data when the request goes away, such as on sign-out", async () => {
    const load = jest.fn().mockResolvedValue("data");
    const { result, rerender } = await renderHook(({ active }: { active: boolean }) => useRequest(active ? load : null, "Failed"), {
      initialProps: { active: true },
    });
    expect(result.current.data).toBe("data");

    await rerender({ active: false });

    expect(result.current.data).toBeNull();
    expect(result.current.status).toBe("idle");
  });
});
