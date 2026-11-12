import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "./colors";

type MessagesHeaderProps = {
  title: string;
  onBack: () => void;
  /** An optional button on the right, such as "Refresh". */
  action?: { label: string; onPress: () => void };
};

/** The navy bar along the top of the messaging screens, with a back button. It matches the map's header. */
export function MessagesHeader({ title, onBack, action }: MessagesHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={8}
        onPress={onBack}
        android_ripple={{ color: "rgba(255, 255, 255, 0.25)", borderless: true }}
        style={styles.back}
      >
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} style={styles.action}>
          <Text style={styles.actionText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    backgroundColor: colors.navy,
    flexDirection: "row",
    gap: 6,
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
  back: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  backText: { color: colors.onNavy, fontSize: 32, lineHeight: 34 },
  title: { color: colors.onNavy, flex: 1, fontSize: 20, fontWeight: "700" },
  action: {
    borderColor: colors.onNavy,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionText: { color: colors.onNavy, fontSize: 13, fontWeight: "600" },
});
