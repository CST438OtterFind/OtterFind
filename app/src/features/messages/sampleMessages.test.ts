import { ApiError } from "@/lib/api";
import { errorText } from "./errors";
import {
  SAMPLE_ME,
  getConversation,
  listConversations,
  listMessages,
  resetSampleMessages,
  sendMessage,
} from "./sampleMessages";

beforeEach(() => resetSampleMessages(Date.now()));

describe("sample messages", () => {
  it("lists conversations with the most recent activity first", async () => {
    const conversations = await listConversations();
    expect(conversations.map((conversation) => conversation.id)).toEqual([1, 2, 3]);
  });

  it("gives each conversation its newest message and when that was", async () => {
    const [first] = await listConversations();
    expect(first.lastMessage?.text).toBe("Near the bike racks by the main entrance.");
    expect(first.lastActivityAt).toBe(first.lastMessage?.sentAt);
  });

  it("loads a conversation's messages oldest first", async () => {
    const messages = await listMessages(1);
    const times = messages.map((message) => Date.parse(message.sentAt));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(messages).toHaveLength(3);
  });

  it("marks only the signed-in user's messages as theirs", async () => {
    for (const conversation of await listConversations()) {
      for (const message of await listMessages(conversation.id)) {
        expect(message.sentByMe).toBe(message.senderId === SAMPLE_ME.id);
      }
    }
  });

  it("loads one conversation's details", async () => {
    const conversation = await getConversation(2);
    expect(conversation.otherParticipant.displayName).toBe("Jordan K.");
    expect(conversation.item.itemName).toBe("Black water bottle");
  });

  it("answers 404 for a conversation that doesn't exist, like the API", async () => {
    await expect(getConversation(99)).rejects.toMatchObject({ status: 404 });
    await expect(listMessages(99)).rejects.toMatchObject({ status: 404 });
    await expect(sendMessage(99, "Hello")).rejects.toMatchObject({ status: 404 });
  });

  it("answers 404 for a bad link, which gives an ID of NaN", async () => {
    await expect(getConversation(Number.NaN)).rejects.toBeInstanceOf(ApiError);
  });

  it("sends a trimmed message as the signed-in user", async () => {
    const sent = await sendMessage(2, "  Yes, that's the one  ");
    expect(sent).toMatchObject({ conversationId: 2, senderId: SAMPLE_ME.id, sentByMe: true, text: "Yes, that's the one" });
  });

  it("makes a sent message the newest, which moves its conversation to the top", async () => {
    const sent = await sendMessage(3, "Thanks again!");
    const messages = await listMessages(3);
    expect(messages[messages.length - 1]).toEqual(sent);
    const [first] = await listConversations();
    expect(first.id).toBe(3);
  });

  it("gives each sent message a new ID", async () => {
    const one = await sendMessage(1, "One");
    const two = await sendMessage(1, "Two");
    expect(one.id === two.id).toBe(false);
  });

  it("refuses an empty message with 400 and stores nothing", async () => {
    const before = await listMessages(1);
    await expect(sendMessage(1, "   ")).rejects.toMatchObject({ status: 400, message: "Write a message first." });
    expect(await listMessages(1)).toHaveLength(before.length);
  });

  it("returns copies, so changing a result doesn't change what's stored", async () => {
    const [first] = await listMessages(1);
    first.text = "Changed";
    const [again] = await listMessages(1);
    expect(again.text).toBe("Hi! I think I saw your cat by the library around noon.");
  });

  it("starts over when it's reset", async () => {
    await sendMessage(1, "Extra");
    resetSampleMessages(Date.now());
    expect(await listMessages(1)).toHaveLength(3);
  });
});

describe("errorText", () => {
  it("shows the API's own message", () => {
    expect(errorText(new ApiError("Can't reach the server.", null), "Fallback")).toBe("Can't reach the server.");
  });

  it("uses the fallback for any other error", () => {
    expect(errorText(new Error("TypeError: undefined"), "Fallback")).toBe("Fallback");
  });
});
