import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/lib/session";
import { describeAge } from "./age";
import { describeLocation, LISTING_TYPE_LABELS } from "./labels";
import { useListings } from "./useListings";
import { useNow } from "./useNow";

/** The signed-in home page: every active listing, newest first. */
export function HomeScreen() {
  const { listings, status, errorMessage, retry } = useListings();
  const { signOut } = useSession();
  const now = useNow();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text accessibilityRole="header" style={styles.title}>
          OtterFind
        </Text>
        <View style={styles.headerActions}>
          <Link href="/map" style={styles.headerLink}>
            Whole map
          </Link>
          <Pressable accessibilityRole="button" onPress={() => void signOut()}>
            <Text style={styles.headerLink}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      {status === "loading" || status === "slow" ? (
        <View style={styles.state}>
          <ActivityIndicator color="#112E51" />
          <Text style={styles.stateText}>
            {status === "slow" ? "Waking the server. On the free hosting plan this can take a minute." : "Loading listings…"}
          </Text>
        </View>
      ) : null}

      {status === "error" ? (
        <View style={styles.state}>
          <Text role="alert" style={styles.error}>
            {errorMessage}
          </Text>
          <Pressable accessibilityRole="button" onPress={retry} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {status === "ready" ? (
        <FlatList
          data={listings}
          keyExtractor={(listing) => String(listing.id)}
          ListEmptyComponent={<Text style={styles.stateText}>Nothing has been posted yet. Open the map to drop the first pin.</Text>}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="link" onPress={() => router.push(`/items/${item.id}`)} style={styles.row}>
              <Text style={styles.rowTitle}>
                {LISTING_TYPE_LABELS[item.listingType]}: {item.title}
              </Text>
              <Text style={styles.rowDetail}>
                {describeLocation(item)} · {describeAge(item.createdAt, now)}
              </Text>
            </Pressable>
          )}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FFFFFF", flex: 1 },
  header: { alignItems: "center", backgroundColor: "#112E51", flexDirection: "row", justifyContent: "space-between", paddingBottom: 10, paddingHorizontal: 14 },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  headerActions: { flexDirection: "row", gap: 16 },
  headerLink: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  state: { gap: 8, padding: 16 },
  stateText: { color: "#3C4A57", fontSize: 14, padding: 16 },
  error: { backgroundColor: "#FBE9EC", borderRadius: 8, color: "#8A0B20", fontSize: 14, padding: 10 },
  button: { alignSelf: "flex-start", borderColor: "#112E51", borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  buttonText: { color: "#112E51", fontSize: 14, fontWeight: "600" },
  row: { borderBottomColor: "#E3E8EE", borderBottomWidth: 1, gap: 4, paddingHorizontal: 16, paddingVertical: 14 },
  rowTitle: { color: "#112E51", fontSize: 16, fontWeight: "600" },
  rowDetail: { color: "#3C4A57", fontSize: 14 },
});
