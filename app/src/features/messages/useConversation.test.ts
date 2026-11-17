import { act, renderHook } from "@testing-library/react-native";
import { ApiError } from "@/lib/api";
import type { Conversation, Message } from "./types";
import { type ConversationApi, useConversation } from "./useConversation";

const conversation: Conversation = {
  id: 7,
  item: { id: 12, itemName: "Grey tabby cat", listingType: "LOST", buildingName: "Library" },
  otherParticipant: { id: 4, displayName: "Maya R." },
  lastMessage: null,
  createdAt: "2026-11-12T20:04:00Z",
  lastActivityAt: "2026-11-12T20:04:00Z",
};

const first: Message = {
  id: 1,
  conversationId: 7,
  senderId: 4,
  sentByMe: false,
  text: "Hi! I think I saw your cat by the library.",
  sentAt: "2026-11-12T20:04:00Z",
};

/** An API that answers straight away. Pass functions to change any part of it. */
function fakeApi(overrides: Partial<ConversationApi> = {}) {
  return {
    get: jest.fn(async (_id: number) => conversation),
    list: jest.fn(async (_id: number) => [first]),
    send: jest.fn(
      async (_id: number, text: string): Promise<Message> => ({ ...first, id: 2, senderId: 1, sentByMe: true, text }),
    ),
    ...overrides,
  };
}

async function loaded(api: ConversationApi) {
  const hook = await renderHook(() => useConversation(7, api));
  await act(async () => {
    await hook.result.current.load();
  });
  return hook;
}

describe("useConversation", () => {
  it("starts out loading, and waits for the screen to ask", async () => {
    const api = fakeApi();
    const { result } = await renderHook(() => useConversation(7, api));
    expect(result.current.status).toBe("loading");
    expect(result.current.conversation).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("loads the conversation and its messages", async () => {
    const api = fakeApi();
    const { result } = await loaded(api);

    expect(result.current.status).toBe("ready");
    expect(result.current.conversation).toEqual(conversation);
    expect(result.current.messages).toEqual([first]);
    expect(api.get).toHaveBeenCalledWith(7);
    expect(api.list).toHaveBeenCalledWith(7);
  });

  it("shows the API's message for a conversation that isn't yours", async () => {
    const api = fakeApi({
      get: jest.fn(async () => {
        throw new ApiError("This conversation doesn't exist, or it isn't yours.", 404);
      }),
    });
    const { result } = await loaded(api);

    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toBe("This conversation doesn't exist, or it isn't yours.");
  });

  it("shows a general message for any other failure", async () => {
    const api = fakeApi({
      list: jest.fn(async (): Promise<Message[]> => {
        throw new Error("TypeError");
      }),
    });
    const { result } = await loaded(api);

    expect(result.current.errorMessage).toBe("Something went wrong loading this conversation.");
  });

  it("sends a trimmed message and adds it to the end", async () => {
    const api = fakeApi();
    const { result } = await loaded(api);

    let sent = false;
    await act(async () => {
      sent = await result.current.send("  Really? Which side?  ");
    });

    expect(sent).toBe(true);
    expect(api.send).toHaveBeenCalledWith(7, "Really? Which side?");
    expect(result.current.messages.map((message) => message.text)).toEqual([first.text, "Really? Which side?"]);
  });

  it("doesn't send an empty message, and says why", async () => {
    const api = fakeApi();
    const { result } = await loaded(api);

    let sent = true;
    await act(async () => {
      sent = await result.current.send("   ");
    });

    expect(sent).toBe(false);
    expect(result.current.sendError).toBe("Write a message first.");
    expect(api.send).not.toHaveBeenCalled();
  });

  it("clears the send error when asked", async () => {
    const { result } = await loaded(fakeApi());

    await act(async () => {
      await result.current.send("");
    });
    await act(async () => result.current.clearSendError());

    expect(result.current.sendError).toBeNull();
  });

  it("reports a failed send with the API's message and keeps the messages", async () => {
    const api = fakeApi({
      send: jest.fn(async (): Promise<Message> => {
        throw new ApiError("The server took too long to respond. Try again.", null);
      }),
    });
    const { result } = await loaded(api);

    let sent = true;
    await act(async () => {
      sent = await result.current.send("Hello");
    });

    expect(sent).toBe(false);
    expect(result.current.sendError).toBe("The server took too long to respond. Try again.");
    expect(result.current.messages).toEqual([first]);
  });

  it("uses a general message when a send fails for another reason", async () => {
    const api = fakeApi({
      send: jest.fn(async (): Promise<Message> => {
        throw new Error("TypeError");
      }),
    });
    const { result } = await loaded(api);

    await act(async () => {
      await result.current.send("Hello");
    });

    expect(result.current.sendError).toBe("Your message didn't send. Try again.");
  });

  it("is sending until the message arrives, and ignores a second tap meanwhile", async () => {
    let finishSend: (message: Message) => void = () => {};
    const api = fakeApi({
      send: jest.fn(
        (_id: number, text: string) =>
          new Promise<Message>((resolve) => {
            finishSend = () => resolve({ ...first, id: 2, sentByMe: true, text });
          }),
      ),
    });
    const { result } = await loaded(api);

    await act(async () => {
      void result.current.send("One");
    });
    expect(result.current.sending).toBe(true);

    let second = true;
    await act(async () => {
      second = await result.current.send("Two");
    });
    expect(second).toBe(false);
    expect(api.send).toHaveBeenCalledTimes(1);

    await act(async () => finishSend(first));
    expect(result.current.sending).toBe(false);
    expect(result.current.messages).toHaveLength(2);
  });

  it("keeps the newest result when an older load finishes last", async () => {
    const answers: ((conversation: Conversation) => void)[] = [];
    const api = fakeApi({
      get: jest.fn(
        () =>
          new Promise<Conversation>((resolve) => {
            answers.push(resolve);
          }),
      ),
    });
    const { result } = await renderHook(() => useConversation(7, api));

    await act(async () => {
      void result.current.load();
      void result.current.load();
    });
    await act(async () => answers[1]({ ...conversation, id: 8 }));
    await act(async () => answers[0](conversation));

    expect(result.current.conversation?.id).toBe(8);
  });
});
