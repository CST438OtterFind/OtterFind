import { act, renderHook } from "@testing-library/react-native";
import { ApiError, type Listing } from "@/lib/api";
import { useListing, useListings } from "./useListings";

const mockGetListings = jest.fn();
const mockGetListing = jest.fn();
let mockSessionStatus = "signedIn";
let mockFocus: (() => void) | null = null;

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  getListings: (...args: unknown[]) => mockGetListings(...args),
  getListing: (...args: unknown[]) => mockGetListing(...args),
}));
jest.mock("@/lib/session", () => ({ useSession: () => ({ status: mockSessionStatus }) }));
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useFocusEffect: (callback: () => void) => {
      mockFocus = callback;
      useEffect(callback, [callback]);
    },
  };
});

const listing = { id: 1, title: "Grey tabby cat" } as Listing;

beforeEach(() => {
  mockSessionStatus = "signedIn";
  mockGetListings.mockReset().mockResolvedValue([listing]);
  mockGetListing.mockReset().mockResolvedValue(listing);
});

describe("useListings", () => {
  it("loads the listings when signed in", async () => {
    const { result } = await renderHook(() => useListings());
    expect(result.current.status).toBe("ready");
    expect(result.current.listings).toEqual([listing]);
  });

  it("doesn't call the API when signed out, because it would only get a 401", async () => {
    mockSessionStatus = "signedOut";
    const { result } = await renderHook(() => useListings());
    expect(mockGetListings).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
    expect(result.current.listings).toEqual([]);
  });

  it("only requests once when the screen first opens", async () => {
    await renderHook(() => useListings());
    expect(mockGetListings).toHaveBeenCalledTimes(1);
  });

  it("refreshes when the screen comes back into view, so a new post shows up", async () => {
    await renderHook(() => useListings());
    await act(async () => mockFocus?.());
    expect(mockGetListings).toHaveBeenCalledTimes(2);
  });

  it("shows the API's message when loading fails", async () => {
    mockGetListings.mockRejectedValue(new ApiError("The database is unreachable.", 503));
    const { result } = await renderHook(() => useListings());
    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toBe("The database is unreachable.");
  });
});

describe("useListing", () => {
  it("loads the listing with the given ID", async () => {
    const { result } = await renderHook(() => useListing(42));
    expect(mockGetListing.mock.calls[0][0]).toBe(42);
    expect(result.current.listing).toEqual(listing);
  });

  it("keeps the status so a screen can tell a missing listing from a failure", async () => {
    mockGetListing.mockRejectedValue(new ApiError("That listing doesn't exist.", 404));
    const { result } = await renderHook(() => useListing(42));
    expect(result.current.error?.status).toBe(404);
  });

  it("waits for sign-in", async () => {
    mockSessionStatus = "loading";
    const { result } = await renderHook(() => useListing(42));
    expect(mockGetListing).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });
});
