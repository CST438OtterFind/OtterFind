import { useCallback } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNow } from "@/lib/useNow";
import { colors } from "./colors";
import { inboxTime, initials, itemSummary, previewText } from "./format";
import { MessagesHeader } from "./MessagesHeader";
import type { Conversation } from "./types";
import { useConversations } from "./useConversations";

/**
 * The inbox (PRD-6): your conversations, most recent first. It runs on the sample store in
 * `sampleMessages.ts` until the messaging API and sign-in exist.
 */
export function InboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { conversations, status, errorMessage, refreshing, load, refresh } = useConversations();

  // Loads again each time the inbox comes back into view, so a message you just sent shows here.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const nothingYet = conversations.length === 0;

  return (
    <View style={styles.screen}>
      <MessagesHeader title="Messages" onBack={goBack} action={{ label: "Refresh", onPress: () => void refresh() }} />

      {status === "loading" && nothingYet ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.navy} accessibilityLabel="Loading your messages" />
        </View>
      ) : status === "error" && nothingYet ? (
        <View style={styles.center}>
          <Text accessibilityLiveRegion="polite" style={styles.errorText}>
            {errorMessage}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(conversation) => String(conversation.id)}
          renderItem={({ item }) => (
            <ConversationRow conversation={item} now={now} onPress={() => router.push(`/messages/${item.id}`)} />
          )}
          ListHeaderComponent={
            errorMessage ? (
              <Text accessibilityLiveRegion="polite" style={styles.banner}>
                {errorMessage}
              </Text>
            ) : undefined
          }
          ListEmptyComponent={<EmptyInbox />}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 12 }]}
        />
      )}
    </View>
  );
}

type ConversationRowProps = {
  conversation: Conversation;
  now: number;
  onPress: () => void;
};

/** One conversation in the inbox: who it's with, the item, the newest message, and when. */
function ConversationRow({ conversation, now, onPress }: ConversationRowProps) {
  const { item, otherParticipant } = conversation;
  const time = inboxTime(conversation.lastActivityAt, now);
  const preview = previewText(conversation);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${otherParticipant.displayName}, about ${item.itemName}. ${preview}. ${time}`}
      accessibilityHint="Opens the conversation"
      onPress={onPress}
      android_ripple={{ color: colors.pressed }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(otherParticipant.displayName)}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text numberOfLines={1} style={styles.name}>
            {otherParticipant.displayName}
          </Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text numberOfLines={1} style={styles.item}>
          {item.itemName} · {itemSummary(item)}
        </Text>
        <Text numberOfLines={1} style={styles.preview}>
          {preview}
        </Text>
      </View>
    </Pressable>
  );
}

/** What the inbox shows before you've messaged anyone. */
function EmptyInbox() {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptyText}>Message someone about their post, and the conversation shows up here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  center: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", padding: 24 },
  list: { flexGrow: 1 },
  banner: {
    backgroundColor: colors.errorBackground,
    borderRadius: 8,
    color: colors.errorText,
    fontSize: 14,
    margin: 12,
    padding: 10,
  },
  errorText: { color: colors.errorText, fontSize: 15, textAlign: "center" },
  retry: { borderColor: colors.navy, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  retryText: { color: colors.navy, fontSize: 14, fontWeight: "600" },
  row: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: { backgroundColor: colors.pressed },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.pressed,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: { color: colors.navy, fontSize: 15, fontWeight: "700" },
  rowBody: { flex: 1, gap: 2, minWidth: 0 },
  rowTop: { alignItems: "baseline", flexDirection: "row", gap: 8 },
  name: { color: colors.text, flex: 1, fontSize: 16, fontWeight: "600" },
  time: { color: colors.secondary, fontSize: 12 },
  item: { color: colors.secondary, fontSize: 13 },
  preview: { color: colors.secondary, fontSize: 14 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  emptyText: { color: colors.secondary, fontSize: 14, maxWidth: 320, textAlign: "center" },
});
