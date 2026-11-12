import type { Conversation, ConversationItem, ListingType, Message } from "./types";

/** The longest message the API accepts, after trimming. See `SendMessageRequest` in docs/openapi.yaml. */
export const MAX_MESSAGE_LENGTH = 1000;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The result of checking a message before it's sent. */
export type MessageCheck = { ok: true; text: string } | { ok: false; message: string };

/**
 * Checks a message the same way the API does: trimmed, then 1 to {@link MAX_MESSAGE_LENGTH} characters.
 *
 * @returns The trimmed text to send, or a message to show the user.
 */
export function checkMessage(draft: string): MessageCheck {
  const text = draft.trim();
  if (text.length === 0) return { ok: false, message: "Write a message first." };
  if (text.length > MAX_MESSAGE_LENGTH) return { ok: false, message: "Messages can be up to 1,000 characters." };
  return { ok: true, text };
}

/** A timestamp in milliseconds, or 0 for one that can't be read, so sorting stays consistent. */
function timeOf(iso: string): number {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? 0 : time;
}

/** The conversations, most recent activity first. The list passed in isn't changed. */
export function sortByLastActivity(conversations: readonly Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => timeOf(b.lastActivityAt) - timeOf(a.lastActivityAt));
}

/** Midnight at the start of the local day that `time` falls on. */
function startOfDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** How many calendar days `then` is before `now`: 0 for today, 1 for yesterday. */
function daysBefore(then: number, now: number): number {
  // Rounded, because a day with a daylight saving change is 23 or 25 hours long.
  return Math.round((startOfDay(now) - startOfDay(then)) / DAY_MS);
}

/** A date such as "Nov 3", with the year added if it isn't this year. */
function shortDate(then: number, now: number): string {
  const date = new Date(then);
  const label = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return date.getFullYear() === new Date(now).getFullYear() ? label : `${label}, ${date.getFullYear()}`;
}

/**
 * How long ago something happened, short enough for the inbox: "Now", "5m", "3h", "Yesterday", or a
 * date such as "Nov 3". A timestamp a little in the future, from a phone clock that's behind, counts as
 * "Now". One that can't be read gives an empty string.
 */
export function inboxTime(iso: string, now: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const elapsed = now - then;
  if (elapsed < MINUTE_MS) return "Now";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m`;
  const days = daysBefore(then, now);
  if (days === 0) return `${Math.floor(elapsed / HOUR_MS)}h`;
  if (days === 1) return "Yesterday";
  return shortDate(then, now);
}

/** The local time a message was sent, such as "12:04 PM". One that can't be read gives an empty string. */
export function messageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
}

/** The heading above a day's messages: "Today", "Yesterday", or a date such as "Nov 3". */
export function dayLabel(iso: string, now: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const days = daysBefore(then, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return shortDate(then, now);
}

/** A message, and the day heading to show above it when it's the first message of a day. */
export type MessageRow = { message: Message; dayLabel: string | null };

/**
 * Pairs each message with a day heading wherever the day changes. Expects the messages oldest first,
 * as the API returns them. A message whose time can't be read stays under the heading before it.
 */
export function messageRows(messages: readonly Message[], now: number): MessageRow[] {
  let previousDay: number | null = null;
  return messages.map((message) => {
    const sent = Date.parse(message.sentAt);
    const day = Number.isNaN(sent) ? previousDay : startOfDay(sent);
    const startsDay = day !== null && day !== previousDay;
    previousDay = day;
    return { message, dayLabel: startsDay ? dayLabel(message.sentAt, now) : null };
  });
}

/** One line from the newest message, for the inbox, such as "You: Is it yours?". */
export function previewText(conversation: Conversation): string {
  const last = conversation.lastMessage;
  if (!last) return "No messages yet";
  const oneLine = last.text.replace(/\s+/g, " ").trim();
  return last.sentByMe ? `You: ${oneLine}` : oneLine;
}

/** Up to two initials for an avatar, such as "MR" for "Maya R.". */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase());
  if (letters.length === 0) return "?";
  return letters.length === 1 ? letters[0] : `${letters[0]}${letters[letters.length - 1]}`;
}

/** What a listing type is called on screen. */
export function listingLabel(type: ListingType): string {
  return type === "LOST" ? "Lost" : "Found";
}

/** Whether the item was lost or found, and where, such as "Lost · Library". */
export function itemSummary(item: ConversationItem): string {
  return item.buildingName ? `${listingLabel(item.listingType)} · ${item.buildingName}` : listingLabel(item.listingType);
}
