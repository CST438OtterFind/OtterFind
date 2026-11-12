import { useLocalSearchParams } from "expo-router";
import { ConversationScreen } from "@/features/messages/ConversationScreen";

/** One conversation, at `/messages/<conversation ID>`. */
export default function ConversationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // A link with a bad ID gives NaN, which the screen shows as not found.
  return <ConversationScreen conversationId={Number(id)} />;
}
