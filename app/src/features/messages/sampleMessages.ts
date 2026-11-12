import { ApiError } from "@/lib/api";
import { checkMessage, sortByLastActivity } from "./format";
import type { Conversation, ConversationItem, Message, Participant } from "./types";

/*
 * PLACEHOLDER until the messaging API (PRD-6) and sign-in exist. An in-memory stand-in for the routes in
 * docs/openapi.yaml, with the same rules: you only see your own conversations, any other ID is a 404,
 * and messages are checked the same way. Each function has the signature its real version in
 * `src/lib/api.ts` will have, so connecting the screens means changing which functions they're given.
 * Everything resets when the app reloads.
 */

/** The signed-in user, until sign-in exists. */
export const SAMPLE_ME: Participant = { id: 1, displayName: "Tony" };

type StoredConversation = {
  id: number;
  item: ConversationItem;
  otherParticipant: Participant;
  createdAt: string;
};

const MINUTE_MS = 60_000;

let conversations: StoredConversation[] = [];
let messages: Message[] = [];
let nextMessageId = 1;

/** Puts the sample conversations back the way they started, timed relative to `now`. Tests call it first. */
export function resetSampleMessages(now: number = Date.now()): void {
  const at = (minutesAgo: number) => new Date(now - minutesAgo * MINUTE_MS).toISOString();
  const cat: StoredConversation = {
    id: 1,
    item: { id: 1, itemName: "Grey tabby cat", listingType: "LOST", buildingName: "Library" },
    otherParticipant: { id: 2, displayName: "Maya R." },
    createdAt: at(40),
  };
  const bottle: StoredConversation = {
    id: 2,
    item: { id: 2, itemName: "Black water bottle", listingType: "FOUND", buildingName: "Student Center" },
    otherParticipant: { id: 3, displayName: "Jordan K." },
    createdAt: at(65),
  };
  const keys: StoredConversation = {
    id: 3,
    item: { id: 4, itemName: "Car keys on an otter keychain", listingType: "FOUND", buildingName: "Dining Commons" },
    otherParticipant: { id: 5, displayName: "Sam P." },
    createdAt: at(26 * 60),
  };

  conversations = [cat, bottle, keys];
  messages = [];
  nextMessageId = 1;

  const add = (conversation: StoredConversation, fromMe: boolean, minutesAgo: number, text: string) => {
    messages.push({
      id: nextMessageId++,
      conversationId: conversation.id,
      senderId: fromMe ? SAMPLE_ME.id : conversation.otherParticipant.id,
      sentByMe: fromMe,
      text,
      sentAt: at(minutesAgo),
    });
  };

  add(cat, false, 40, "Hi! I think I saw your cat by the library around noon.");
  add(cat, true, 37, "Really? Which side of the building?");
  add(cat, false, 2, "Near the bike racks by the main entrance.");
  add(bottle, true, 60, "Is it the one with the otter sticker?");
  add(keys, true, 26 * 60, "Those are mine! Where can I pick them up?");
  add(keys, false, 25 * 60 + 30, "They're at the Dining Commons front desk.");
  add(keys, true, 25 * 60, "Thanks, I picked them up.");
}

resetSampleMessages();

function notFound(): ApiError {
  return new ApiError("This conversation doesn't exist, or it isn't yours.", 404);
}

function findConversation(conversationId: number): StoredConversation {
  const found = conversations.find((conversation) => conversation.id === conversationId);
  if (!found) throw notFound();
  return found;
}

function messagesIn(conversationId: number): Message[] {
  return messages.filter((message) => message.conversationId === conversationId).map((message) => ({ ...message }));
}

function toConversation(stored: StoredConversation): Conversation {
  const own = messagesIn(stored.id);
  const lastMessage = own.length > 0 ? own[own.length - 1] : null;
  return { ...stored, lastMessage, lastActivityAt: lastMessage ? lastMessage.sentAt : stored.createdAt };
}

/** Like `GET /api/conversations`: your conversations, most recent activity first. */
export async function listConversations(): Promise<Conversation[]> {
  return sortByLastActivity(conversations.map(toConversation));
}

/**
 * Like `GET /api/conversations/{conversationId}`.
 *
 * @throws {@link ApiError} with status 404 for a conversation that doesn't exist or isn't yours.
 */
export async function getConversation(conversationId: number): Promise<Conversation> {
  return toConversation(findConversation(conversationId));
}

/**
 * Like `GET /api/conversations/{conversationId}/messages`: the messages, oldest first.
 *
 * @throws {@link ApiError} with status 404 for a conversation that doesn't exist or isn't yours.
 */
export async function listMessages(conversationId: number): Promise<Message[]> {
  findConversation(conversationId);
  return messagesIn(conversationId);
}

/**
 * Like `POST /api/conversations/{conversationId}/messages`: sends a message as you.
 *
 * @throws {@link ApiError} with status 404 for a conversation that doesn't exist or isn't yours, or 400
 *   for text that's empty or too long once trimmed.
 */
export async function sendMessage(conversationId: number, text: string): Promise<Message> {
  findConversation(conversationId);
  const check = checkMessage(text);
  if (!check.ok) throw new ApiError(check.message, 400);
  const message: Message = {
    id: nextMessageId++,
    conversationId,
    senderId: SAMPLE_ME.id,
    sentByMe: true,
    text: check.text,
    sentAt: new Date().toISOString(),
  };
  messages.push(message);
  return { ...message };
}
