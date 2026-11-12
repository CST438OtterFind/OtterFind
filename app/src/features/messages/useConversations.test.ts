import { act, renderHook } from "@testing-library/react-native";
import { ApiError } from "@/lib/api";
import type { Conversation } from "./types";
import { useConversations } from "./useConversations";

const conversation: Conversation = {
  id: 7,
  item: { id: 12, itemName: "Grey tabby cat", listingType: "LOST", buildingName: "Library" },
  otherParticipant: { id: 4, displayName: "Maya R." },
  lastMessage: null,
  createdAt: "2026-11-12T20:04:00Z",
  lastActivityAt: "2026-11-12T20:04:00Z",
};

/** A list function the test finishes by hand, so each state can be checked on the way through. */
function controlledList() {
  const requests: { resolve: (conversations: Conversation[]) => void; reject: (error: unknown) => void }[] = [];
  const list = jest.fn(
    () =>
      new Promise<Conversation[]>((resolve, reject) => {
        requests.push({ resolve, reject });
      }),
  );
  return { list, requests };
}

describe("useConversations", () => {
  it("starts out loading, and waits for the screen to ask", async () => {
    const { list } = controlledList();
    const { result } = await renderHook(() => useConversations(list));
    expect(result.current.status).toBe("loading");
    expect(result.current.conversations).toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });

  it("is ready once the conversations arrive", async () => {
    const { list, requests } = controlledList();
    const { result } = await renderHook(() => useConversations(list));

    await act(async () => {
      void result.current.load();
    });
    await act(async () => requests[0].resolve([conversation]));

    expect(result.current.status).toBe("ready");
    expect(result.current.conversations).toEqual([conversation]);
  });

  it("shows the API's message when loading fails", async () => {
    const { list, requests } = controlledList();
    const { result } = await renderHook(() => useConversations(list));

    await act(async () => {
      void result.current.load();
    });
    await act(async () => requests[0].reject(new ApiError("Can't reach the server.", null)));

    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toBe("Can't reach the server.");
  });

  it("shows a general message for any other failure", async () => {
    const { list, requests } = controlledList();
    const { result } = await renderHook(() => useConversations(list));

    await act(async () => {
      void result.current.load();
    });
    await act(async () => requests[0].reject(new Error("TypeError")));

    expect(result.current.errorMessage).toBe("Something went wrong loading your messages.");
  });

  it("keeps the conversations on screen while it loads again", async () => {
    const { list, requests } = controlledList();
    const { result } = await renderHook(() => useConversations(list));

    await act(async () => {
      void result.current.load();
    });
    await act(async () => requests[0].resolve([conversation]));
    await act(async () => {
      void result.current.load();
    });

    expect(result.current.status).toBe("ready");
    expect(result.current.conversations).toEqual([conversation]);
  });

  it("clears an old error once a load works", async () => {
    const { list, requests } = controlledList();
    const { result } = await renderHook(() => useConversations(list));

    await act(async () => {
      void result.current.load();
    });
    await act(async () => requests[0].reject(new Error("Offline")));
    await act(async () => {
      void result.current.load();
    });
    await act(async () => requests[1].resolve([conversation]));

    expect(result.current.status).toBe("ready");
    expect(result.current.errorMessage).toBeNull();
  });

  it("shows pull-to-refresh as refreshing until it finishes", async () => {
    const { list, requests } = controlledList();
    const { result } = await renderHook(() => useConversations(list));

    await act(async () => {
      void result.current.refresh();
    });
    expect(result.current.refreshing).toBe(true);

    await act(async () => requests[0].resolve([conversation]));
    expect(result.current.refreshing).toBe(false);
  });

  it("keeps the newest result when an older request finishes last", async () => {
    const { list, requests } = controlledList();
    const { result } = await renderHook(() => useConversations(list));

    await act(async () => {
      void result.current.load();
      void result.current.load();
    });
    await act(async () => requests[1].resolve([conversation]));
    await act(async () => requests[0].resolve([]));

    expect(result.current.conversations).toEqual([conversation]);
  });

  it("ignores a result that arrives after the screen closes", async () => {
    const { list, requests } = controlledList();
    const { result, unmount } = await renderHook(() => useConversations(list));

    await act(async () => {
      void result.current.load();
    });
    await act(async () => unmount());
    await act(async () => requests[0].resolve([conversation]));

    expect(result.current.conversations).toEqual([]);
  });
});
