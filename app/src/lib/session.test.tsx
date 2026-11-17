import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";
import { setSessionExpiredHandler } from "./api";
import { SessionProvider, useSession } from "./session";
import { tokenStore } from "./tokenStore";

jest.mock("./tokenStore", () => ({ tokenStore: { get: jest.fn(), set: jest.fn(), clear: jest.fn() } }));
jest.mock("./api", () => ({ setSessionExpiredHandler: jest.fn() }));

const store = tokenStore as jest.Mocked<typeof tokenStore>;
const wrapper = ({ children }: { children: ReactNode }) => <SessionProvider>{children}</SessionProvider>;

beforeEach(() => {
  jest.clearAllMocks();
  store.get.mockResolvedValue(null);
  store.set.mockResolvedValue();
  store.clear.mockResolvedValue();
});

describe("useSession", () => {
  it("is signed out with no saved token", async () => {
    const { result } = await renderHook(() => useSession(), { wrapper });
    expect(result.current.status).toBe("signedOut");
  });

  it("restores a saved token, so a reload stays signed in", async () => {
    store.get.mockResolvedValue("token");
    const { result } = await renderHook(() => useSession(), { wrapper });
    expect(result.current.status).toBe("signedIn");
  });

  it("saves the token on sign-in", async () => {
    const { result } = await renderHook(() => useSession(), { wrapper });

    await act(() => result.current.signIn("token"));

    expect(store.set).toHaveBeenCalledWith("token");
    expect(result.current.status).toBe("signedIn");
  });

  it("clears the token on sign-out", async () => {
    store.get.mockResolvedValue("token");
    const { result } = await renderHook(() => useSession(), { wrapper });

    await act(() => result.current.signOut());

    expect(store.clear).toHaveBeenCalled();
    expect(result.current.status).toBe("signedOut");
  });

  it("signs out when the API rejects the token", async () => {
    store.get.mockResolvedValue("token");
    const { result } = await renderHook(() => useSession(), { wrapper });
    const handler = jest.mocked(setSessionExpiredHandler).mock.calls.at(-1)![0];

    await act(async () => handler());

    expect(result.current.status).toBe("signedOut");
  });

  it("explains a missing provider instead of failing silently", async () => {
    await expect(renderHook(() => useSession())).rejects.toThrow("SessionProvider");
  });
});
