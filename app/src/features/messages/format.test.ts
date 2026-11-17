import {
  MAX_MESSAGE_LENGTH,
  checkMessage,
  dayLabel,
  inboxTime,
  initials,
  itemSummary,
  listingLabel,
  messageRows,
  messageTime,
  previewText,
  sortByLastActivity,
} from "./format";
import type { Conversation, Message } from "./types";

/** A local time, so the tests pass in any time zone. Months count from 0, so 10 is November. */
function local(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month, day, hour, minute);
}

const NOW = local(2026, 10, 12, 12, 0).getTime();
const MINUTE = 60_000;

function iso(date: Date): string {
  return date.toISOString();
}

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: 1,
    conversationId: 7,
    senderId: 4,
    sentByMe: false,
    text: "Near the bike racks by the main entrance.",
    sentAt: iso(local(2026, 10, 12, 11, 0)),
    ...overrides,
  };
}

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 7,
    item: { id: 12, itemName: "Grey tabby cat", listingType: "LOST", buildingName: "Library" },
    otherParticipant: { id: 4, displayName: "Maya R." },
    lastMessage: message(),
    createdAt: iso(local(2026, 10, 12, 10, 0)),
    lastActivityAt: iso(local(2026, 10, 12, 11, 0)),
    ...overrides,
  };
}

describe("checkMessage", () => {
  it("trims the text it returns", () => {
    expect(checkMessage("  Is it yours?  ")).toEqual({ ok: true, text: "Is it yours?" });
  });

  it("rejects an empty message", () => {
    expect(checkMessage("")).toEqual({ ok: false, message: "Write a message first." });
  });

  it("rejects a message that's only spaces and new lines", () => {
    expect(checkMessage("  \n\t ")).toEqual({ ok: false, message: "Write a message first." });
  });

  it("accepts a message right at the limit", () => {
    expect(checkMessage("a".repeat(MAX_MESSAGE_LENGTH)).ok).toBe(true);
  });

  it("rejects a message over the limit", () => {
    expect(checkMessage("a".repeat(MAX_MESSAGE_LENGTH + 1))).toEqual({
      ok: false,
      message: "Messages can be up to 1,000 characters.",
    });
  });

  it("measures the length after trimming, like the API", () => {
    expect(checkMessage(`   ${"a".repeat(MAX_MESSAGE_LENGTH)}   `).ok).toBe(true);
  });
});

describe("sortByLastActivity", () => {
  const older = conversation({ id: 1, lastActivityAt: iso(local(2026, 10, 11, 9, 0)) });
  const newer = conversation({ id: 2, lastActivityAt: iso(local(2026, 10, 12, 9, 0)) });

  it("puts the most recent activity first", () => {
    expect(sortByLastActivity([older, newer]).map((c) => c.id)).toEqual([2, 1]);
  });

  it("doesn't change the list it's given", () => {
    const list = [older, newer];
    sortByLastActivity(list);
    expect(list.map((c) => c.id)).toEqual([1, 2]);
  });

  it("puts a conversation with an unreadable time last", () => {
    const broken = conversation({ id: 3, lastActivityAt: "not a date" });
    expect(sortByLastActivity([broken, older, newer]).map((c) => c.id)).toEqual([2, 1, 3]);
  });
});

describe("inboxTime", () => {
  it("says Now for under a minute ago", () => {
    expect(inboxTime(new Date(NOW - 30_000).toISOString(), NOW)).toBe("Now");
  });

  it("says Now for a time a little in the future, from a phone clock that's behind", () => {
    expect(inboxTime(new Date(NOW + 90_000).toISOString(), NOW)).toBe("Now");
  });

  it("counts minutes for under an hour ago", () => {
    expect(inboxTime(new Date(NOW - 5 * MINUTE).toISOString(), NOW)).toBe("5m");
    expect(inboxTime(new Date(NOW - 59 * MINUTE).toISOString(), NOW)).toBe("59m");
  });

  it("counts hours for earlier today", () => {
    expect(inboxTime(iso(local(2026, 10, 12, 9, 0)), NOW)).toBe("3h");
  });

  it("says Yesterday for the day before, even when it's under 24 hours ago", () => {
    expect(inboxTime(iso(local(2026, 10, 11, 23, 0)), NOW)).toBe("Yesterday");
  });

  it("shows the date for anything older", () => {
    expect(inboxTime(iso(local(2026, 10, 3, 15, 0)), NOW)).toBe("Nov 3");
  });

  it("adds the year when it isn't this year", () => {
    expect(inboxTime(iso(local(2025, 11, 30, 15, 0)), NOW)).toBe("Dec 30, 2025");
  });

  it("is empty for a time it can't read", () => {
    expect(inboxTime("not a date", NOW)).toBe("");
  });
});

describe("messageTime", () => {
  it("shows the local time with AM or PM", () => {
    expect(messageTime(iso(local(2026, 10, 12, 9, 30)))).toBe("9:30 AM");
    expect(messageTime(iso(local(2026, 10, 12, 23, 59)))).toBe("11:59 PM");
  });

  it("shows noon and midnight as 12", () => {
    expect(messageTime(iso(local(2026, 10, 12, 12, 4)))).toBe("12:04 PM");
    expect(messageTime(iso(local(2026, 10, 12, 0, 5)))).toBe("12:05 AM");
  });

  it("is empty for a time it can't read", () => {
    expect(messageTime("not a date")).toBe("");
  });
});

describe("dayLabel", () => {
  it("says Today and Yesterday", () => {
    expect(dayLabel(iso(local(2026, 10, 12, 8, 0)), NOW)).toBe("Today");
    expect(dayLabel(iso(local(2026, 10, 11, 8, 0)), NOW)).toBe("Yesterday");
  });

  it("shows the date for anything older", () => {
    expect(dayLabel(iso(local(2026, 10, 1, 8, 0)), NOW)).toBe("Nov 1");
  });

  it("treats a time in the future as today", () => {
    expect(dayLabel(new Date(NOW + 5 * MINUTE).toISOString(), NOW)).toBe("Today");
  });

  it("is empty for a time it can't read", () => {
    expect(dayLabel("not a date", NOW)).toBe("");
  });
});

describe("messageRows", () => {
  it("puts a day heading on the first message of each day", () => {
    const messages = [
      message({ id: 1, sentAt: iso(local(2026, 10, 11, 20, 0)) }),
      message({ id: 2, sentAt: iso(local(2026, 10, 11, 21, 0)) }),
      message({ id: 3, sentAt: iso(local(2026, 10, 12, 8, 0)) }),
    ];
    expect(messageRows(messages, NOW).map((row) => row.dayLabel)).toEqual(["Yesterday", null, "Today"]);
  });

  it("keeps a message with an unreadable time under the heading before it", () => {
    const messages = [message({ id: 1 }), message({ id: 2, sentAt: "not a date" })];
    expect(messageRows(messages, NOW).map((row) => row.dayLabel)).toEqual(["Today", null]);
  });

  it("gives no heading when the first message's time can't be read", () => {
    expect(messageRows([message({ sentAt: "not a date" })], NOW).map((row) => row.dayLabel)).toEqual([null]);
  });

  it("returns nothing for no messages", () => {
    expect(messageRows([], NOW)).toEqual([]);
  });
});

describe("previewText", () => {
  it("shows the other person's message as it is", () => {
    expect(previewText(conversation())).toBe("Near the bike racks by the main entrance.");
  });

  it("starts your own message with You", () => {
    expect(previewText(conversation({ lastMessage: message({ sentByMe: true, text: "Is it yours?" }) }))).toBe(
      "You: Is it yours?",
    );
  });

  it("joins a message's lines into one", () => {
    expect(previewText(conversation({ lastMessage: message({ text: "Thanks!\n\nSee you  soon" }) }))).toBe(
      "Thanks! See you soon",
    );
  });

  it("says so when nobody has written yet", () => {
    expect(previewText(conversation({ lastMessage: null }))).toBe("No messages yet");
  });
});

describe("initials", () => {
  it("takes the first and last initials", () => {
    expect(initials("Maya R.")).toBe("MR");
    expect(initials("mary ann smith")).toBe("MS");
  });

  it("takes one initial from a single name", () => {
    expect(initials("  cher ")).toBe("C");
  });

  it("falls back to a question mark for a blank name", () => {
    expect(initials("   ")).toBe("?");
  });
});

describe("listingLabel and itemSummary", () => {
  it("names the listing type", () => {
    expect(listingLabel("LOST")).toBe("Lost");
    expect(listingLabel("FOUND")).toBe("Found");
  });

  it("adds the building when there is one", () => {
    expect(itemSummary({ id: 1, itemName: "Grey tabby cat", listingType: "LOST", buildingName: "Library" })).toBe(
      "Lost · Library",
    );
    expect(itemSummary({ id: 2, itemName: "Black water bottle", listingType: "FOUND", buildingName: null })).toBe(
      "Found",
    );
  });
});
