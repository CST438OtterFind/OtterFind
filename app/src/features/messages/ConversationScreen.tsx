import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNow } from "@/lib/useNow";
import { colors } from "./colors";
import { MAX_MESSAGE_LENGTH, type MessageRow, itemSummary, messageRows, messageTime } from "./format";
import { MessagesHeader } from "./MessagesHeader";
import { useConversation } from "./useConversation";

/** A character count appears once a message gets this close to the limit. */
const SHOW_COUNT_FROM = MAX_MESSAGE_LENGTH - 100;

type ConversationScreenProps = {
  /** From the page's address. A bad link gives NaN, which shows as not found. */
  conversationId: number;
};

/**
 * One conversation (PRD-6): who it's with, the item it's about, the messages, and a box to send more.
 * It runs on the sample store in `sampleMessages.ts` until the messaging API and sign-in exist.
 */
export function ConversationScreen({ conversationId }: ConversationScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { conversation, messages, status, errorMessage, load, send, sending, sendError, clearSendError } =
    useConversation(conversationId);
  const [draft, setDraft] = useState("");
  const list = useRef<FlatList<MessageRow>>(null);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const rows = useMemo(() => messageRows(messages, now), [messages, now]);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/messages"));

  const submit = async () => {
    if (await send(draft)) setDraft("");
  };

  if (!conversation) {
    return (
      <View style={styles.screen}>
        <MessagesHeader title="Conversation" onBack={goBack} />
        <View style={styles.center}>
          {status === "error" ? (
            <>
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                {errorMessage}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </>
          ) : (
            <ActivityIndicator color={colors.navy} accessibilityLabel="Loading the conversation" />
          )}
        </View>
      </View>
    );
  }

  const { item, otherParticipant } = conversation;
  const count = draft.length >= SHOW_COUNT_FROM ? `${draft.length} / ${MAX_MESSAGE_LENGTH}` : null;

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <MessagesHeader title={otherParticipant.displayName} onBack={goBack} />

      {/* Once the item page is a route, this card links to it. */}
      <View accessible accessibilityLabel={`About ${item.itemName}. ${itemSummary(item)}`} style={styles.itemCard}>
        <View style={styles.itemThumb}>
          <Text style={styles.itemThumbText}>{item.itemName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.itemBody}>
          <Text numberOfLines={1} style={styles.itemName}>
            {item.itemName}
          </Text>
          <Text numberOfLines={1} style={styles.itemMeta}>
            {itemSummary(item)}
          </Text>
        </View>
      </View>

      {errorMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.banner}>
          {errorMessage}
        </Text>
      ) : null}

      <FlatList
        ref={list}
        data={rows}
        keyExtractor={(row) => String(row.message.id)}
        renderItem={({ item: row }) => <MessageBubble row={row} otherName={otherParticipant.displayName} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>Send the first message about this item.</Text>
          </View>
        }
        // Opens at the newest message, and follows new ones as they're added.
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.messages}
      />

      <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
        {sendError ? (
          <Text accessibilityLiveRegion="polite" style={styles.sendError}>
            {sendError}
          </Text>
        ) : null}
        <View style={styles.composerRow}>
          <TextInput
            accessibilityLabel="Message"
            placeholder="Message"
            placeholderTextColor={colors.secondary}
            value={draft}
            onChangeText={(text) => {
              setDraft(text);
              if (sendError) clearSendError();
            }}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ busy: sending }}
            onPress={() => void submit()}
            style={({ pressed }) => [styles.send, pressed && styles.sendPressed]}
          >
            <Text style={styles.sendText}>{sending ? "Sending…" : "Send"}</Text>
          </Pressable>
        </View>
        {count ? <Text style={styles.count}>{count}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

/** One message: yours on the right in navy, theirs on the left, with a day heading when the day changes. */
function MessageBubble({ row, otherName }: { row: MessageRow; otherName: string }) {
  const { message, dayLabel } = row;
  const mine = message.sentByMe;
  const time = messageTime(message.sentAt);

  return (
    <View>
      {dayLabel ? <Text style={styles.day}>{dayLabel}</Text> : null}
      <View
        accessible
        accessibilityLabel={`${mine ? "You" : otherName}, ${time}: ${message.text}`}
        style={[styles.bubbleGroup, mine ? styles.mineGroup : styles.theirsGroup]}
      >
        <View style={[styles.bubble, mine ? styles.mineBubble : styles.theirsBubble]}>
          <Text style={mine ? styles.mineText : styles.theirsText}>{message.text}</Text>
        </View>
        <Text style={styles.time}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  center: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", padding: 24 },
  errorText: { color: colors.errorText, fontSize: 15, textAlign: "center" },
  retry: { borderColor: colors.navy, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  retryText: { color: colors.navy, fontSize: 14, fontWeight: "600" },
  banner: {
    backgroundColor: colors.errorBackground,
    borderRadius: 8,
    color: colors.errorText,
    fontSize: 14,
    marginHorizontal: 12,
    marginTop: 8,
    padding: 10,
  },
  itemCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 10,
  },
  itemThumb: {
    alignItems: "center",
    backgroundColor: colors.pressed,
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  itemThumbText: { color: colors.navy, fontSize: 17, fontWeight: "700" },
  itemBody: { flex: 1, minWidth: 0 },
  itemName: { color: colors.text, fontSize: 15, fontWeight: "600" },
  itemMeta: { color: colors.secondary, fontSize: 13 },
  messages: { flexGrow: 1, gap: 6, padding: 12 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  emptyText: { color: colors.secondary, fontSize: 14, textAlign: "center" },
  day: { color: colors.secondary, fontSize: 12, marginVertical: 8, textAlign: "center" },
  bubbleGroup: { gap: 3, maxWidth: "80%" },
  mineGroup: { alignItems: "flex-end", alignSelf: "flex-end" },
  theirsGroup: { alignItems: "flex-start", alignSelf: "flex-start" },
  bubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  mineBubble: { backgroundColor: colors.navy, borderBottomRightRadius: 4 },
  theirsBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  mineText: { color: colors.onNavy, fontSize: 15, lineHeight: 21 },
  theirsText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  time: { color: colors.secondary, fontSize: 11, marginHorizontal: 4 },
  composer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  composerRow: { alignItems: "flex-end", flexDirection: "row", gap: 8 },
  input: {
    borderColor: colors.inputBorder,
    borderRadius: 20,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  send: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 20,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 16,
  },
  sendPressed: { opacity: 0.85 },
  sendText: { color: colors.onNavy, fontSize: 15, fontWeight: "600" },
  sendError: { color: colors.errorText, fontSize: 13 },
  count: { alignSelf: "flex-end", color: colors.secondary, fontSize: 12 },
});
