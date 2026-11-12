/**
 * Messaging data, as described in docs/openapi.yaml (`Conversation`, `Message` and the schemas they
 * use). Everything is seen from the signed-in user's side: `otherParticipant` is the other person, and
 * `sentByMe` marks the user's own messages.
 */

/** Whether the item's poster lost it or found it. */
export type ListingType = "LOST" | "FOUND";

/** The item a conversation is about. */
export type ConversationItem = {
  id: number;
  itemName: string;
  listingType: ListingType;
  buildingName: string | null;
};

/** A person in a conversation. */
export type Participant = {
  id: number;
  displayName: string;
};

/** One message in a conversation. */
export type Message = {
  id: number;
  conversationId: number;
  senderId: number;
  sentByMe: boolean;
  text: string;
  /** ISO 8601 timestamp. */
  sentAt: string;
};

/** One person asking about one item, and the item's poster. */
export type Conversation = {
  id: number;
  item: ConversationItem;
  otherParticipant: Participant;
  /** The newest message, or null if nobody has written yet. */
  lastMessage: Message | null;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** When the newest message was sent, or `createdAt` if there are no messages. */
  lastActivityAt: string;
};
