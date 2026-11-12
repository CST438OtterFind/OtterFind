import { StyleSheet, View } from "react-native";
import { Link } from "expo-router";
import App from "../../../App";

/** The sign-in page in the root `App.tsx`, with links to the campus map and messages. Once sign-in exists, PRD-1 sends signed-in users to the feed. */
export default function Index() {
  return (
    <View style={styles.screen}>
      <View style={styles.app}>
        <App />
      </View>
      <View style={styles.bar}>
        <Link href="/map" style={styles.link}>
          View campus map
        </Link>
        <Link href="/messages" style={styles.link}>
          Messages
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  app: { flex: 1 },
  bar: { backgroundColor: "#112E51", flexDirection: "row", gap: 24, justifyContent: "center", padding: 14 },
  link: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
