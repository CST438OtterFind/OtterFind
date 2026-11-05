import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, type StyleProp, StyleSheet, Text, TextInput, View, type ViewStyle } from "react-native";
import type { Building } from "@/lib/api";
import { type Pin, describePin, filterBuildings } from "./campus";

type MapPanelProps = {
  buildings: Building[];
  status: "loading" | "slow" | "ready" | "error";
  errorMessage: string | null;
  onRetry: () => void;
  pin: Pin | null;
  /** A message explaining why the last tap was refused. */
  notice: string | null;
  onChooseBuilding: (building: Building) => void;
  onClearPin: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Shows the dropped pin and the list of buildings beside the map. */
export function MapPanel({ buildings, status, errorMessage, onRetry, pin, notice, onChooseBuilding, onClearPin, style }: MapPanelProps) {
  const [search, setSearch] = useState("");
  const matches = useMemo(() => filterBuildings(buildings, search), [buildings, search]);

  return (
    <View style={[styles.panel, style]}>
      <View testID="pin-summary" accessibilityLiveRegion="polite" style={styles.summary}>
        {pin ? (
          <>
            <Text style={styles.summaryTitle}>{describePin(pin)}</Text>
            <Text style={styles.coordinates}>
              {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
            </Text>
            <Pressable accessibilityRole="button" onPress={onClearPin} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Clear pin</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.hint}>Choose a building, or tap the map to drop a pin.</Text>
        )}
      </View>

      {notice ? (
        <Text role="alert" style={styles.notice}>
          {notice}
        </Text>
      ) : null}

      <TextInput
        accessibilityLabel="Search buildings"
        placeholder="Search buildings"
        placeholderTextColor="#55636F"
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      {status === "loading" || status === "slow" ? (
        <View style={styles.state}>
          <ActivityIndicator color="#112E51" />
          <Text style={styles.stateText}>
            {status === "slow" ? "Waking the server. On the free hosting plan this can take a minute." : "Loading buildings…"}
          </Text>
        </View>
      ) : null}

      {status === "error" ? (
        <View style={styles.state}>
          <Text role="alert" style={styles.notice}>
            {errorMessage}
          </Text>
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {status === "ready" ? (
        <FlatList
          style={styles.list}
          data={matches}
          keyExtractor={(building) => String(building.id)}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.stateText}>No buildings match “{search.trim()}”.</Text>}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => onChooseBuilding(item)}
              style={[styles.row, pin?.building?.id === item.id && styles.rowChosen]}
            >
              <Text style={styles.rowText}>{item.name}</Text>
            </Pressable>
          )}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: "#FFFFFF", padding: 12, gap: 10 },
  summary: { backgroundColor: "#F1F4F8", borderRadius: 8, padding: 12, gap: 4 },
  summaryTitle: { color: "#112E51", fontSize: 16, fontWeight: "600" },
  coordinates: { color: "#3C4A57", fontSize: 13 },
  hint: { color: "#3C4A57", fontSize: 14 },
  notice: { backgroundColor: "#FBE9EC", borderRadius: 8, color: "#8A0B20", fontSize: 14, padding: 10 },
  search: { borderColor: "#6B7985", borderRadius: 8, borderWidth: 1, color: "#112E51", fontSize: 15, paddingHorizontal: 12, paddingVertical: 10 },
  state: { gap: 8, paddingVertical: 8 },
  stateText: { color: "#3C4A57", fontSize: 14, paddingVertical: 8 },
  list: { flex: 1 },
  row: { borderBottomColor: "#E3E8EE", borderBottomWidth: 1, paddingHorizontal: 8, paddingVertical: 12 },
  rowChosen: { backgroundColor: "#E6EEF7" },
  rowText: { color: "#112E51", fontSize: 15 },
  secondaryButton: { alignSelf: "flex-start", borderColor: "#112E51", borderRadius: 8, borderWidth: 1, marginTop: 4, paddingHorizontal: 12, paddingVertical: 6 },
  secondaryButtonText: { color: "#112E51", fontSize: 14, fontWeight: "600" },
});
