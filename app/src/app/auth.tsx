import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

/** The popup lands here; _layout.tsx completes AuthSession and returns the result to the original window. */
export default function AuthCallback() {
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>Completing sign-in…</Text>
      <Text style={styles.message}>This window should close automatically. If it stays open, return to the original OtterFind tab.</Text>
      <Link href="/" style={styles.link}>Return to OtterFind</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16, backgroundColor: "#F5F8F5" },
  title: { fontSize: 24, fontWeight: "700", color: "#17231D" },
  message: { maxWidth: 420, textAlign: "center", color: "#56645C", fontSize: 16, lineHeight: 24 },
  link: { color: "#0B5D43", fontSize: 16, textDecorationLine: "underline" },
});
