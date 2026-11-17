import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, type StyleProp, StyleSheet, Text, TextInput, View, type ViewStyle } from "react-native";
import { type AgeBand, describeAge } from "@/features/listings/age";
import { describeLocation, LISTING_TYPE_LABELS } from "@/features/listings/labels";
import { SavePinForm } from "@/features/listings/SavePinForm";
import type { Building, Listing } from "@/lib/api";
import type { RequestStatus } from "@/lib/useRequest";
import { type Pin, describePin, filterBuildings } from "./campus";
import { LISTING_AGE_COLORS, LISTING_AGE_LABELS } from "./mapData";

const AGE_BANDS = Object.keys(LISTING_AGE_LABELS) as AgeBand[];

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
  signedIn: boolean;
  listings: Listing[];
  listingsStatus: RequestStatus;
  listingsError: string | null;
  onRetryListings: () => void;
  /** The listing the map was opened on, for PRD-5's building and last-seen time. */
  focusedListing: Listing | null;
  /** Confirms the last pin saved. */
  savedMessage: string | null;
  now: number;
  onSaved: (listing: Listing) => void;
  onOpenListing: (listing: Listing) => void;
  style?: StyleProp<ViewStyle>;
};

/** Shows the dropped pin, the form that saves it, and the lists of buildings and saved listings beside the map. */
export function MapPanel({
  buildings,
  status,
  errorMessage,
  onRetry,
  pin,
  notice,
  onChooseBuilding,
  onClearPin,
  signedIn,
  listings,
  listingsStatus,
  listingsError,
  onRetryListings,
  focusedListing,
  savedMessage,
  now,
  onSaved,
  onOpenListing,
  style,
}: MapPanelProps) {
  const [search, setSearch] = useState("");
  const [chosenView, setChosenView] = useState<"buildings" | "listings" | null>(null);
  const matches = useMemo(() => filterBuildings(buildings, search), [buildings, search]);
  const view = chosenView ?? (signedIn ? "listings" : "buildings");
  const saving = signedIn && pin !== null;

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

      {focusedListing ? (
        <View testID="focused-listing" style={styles.summary}>
          <Text style={styles.summaryTitle}>{focusedListing.title}</Text>
          <Text style={styles.coordinates}>{describeLocation(focusedListing)}</Text>
          <Text style={styles.coordinates}>Last seen {describeAge(focusedListing.lastSeenAt, now)}</Text>
        </View>
      ) : null}

      {savedMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.saved}>
          {savedMessage}
        </Text>
      ) : null}

      {pin && !signedIn ? <Text style={styles.hint}>Sign in to save this pin.</Text> : null}

      {notice ? (
        <Text role="alert" style={styles.notice}>
          {notice}
        </Text>
      ) : null}

      {saving ? (
        <SavePinForm
          key={`${pin.latitude},${pin.longitude}`}
          pin={pin}
          onSaved={(listing) => {
            // Go back to the listings, so the new pin is in view.
            setChosenView(null);
            onSaved(listing);
          }}
        />
      ) : null}

      {!saving && signedIn ? (
        <View accessibilityRole="radiogroup" style={styles.views}>
          <ViewChoice label="Listings" selected={view === "listings"} onPress={() => setChosenView("listings")} />
          <ViewChoice label="Buildings" selected={view === "buildings"} onPress={() => setChosenView("buildings")} />
        </View>
      ) : null}

      {!saving && view === "listings" ? (
        <>
          <View style={styles.legend}>
            {AGE_BANDS.map((band) => (
              <View key={band} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: LISTING_AGE_COLORS[band] }]} />
                <Text style={styles.legendText}>{LISTING_AGE_LABELS[band]}</Text>
              </View>
            ))}
          </View>
          {listingsStatus === "loading" || listingsStatus === "slow" ? <ActivityIndicator color="#112E51" /> : null}
          {listingsStatus === "error" ? (
            <View style={styles.state}>
              <Text role="alert" style={styles.notice}>
                {listingsError}
              </Text>
              <Pressable accessibilityRole="button" onPress={onRetryListings} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}
          {listingsStatus === "ready" ? (
            <FlatList
              style={styles.list}
              data={listings}
              keyExtractor={(listing) => String(listing.id)}
              ListEmptyComponent={<Text style={styles.stateText}>Nothing has been posted yet. Tap the map to drop the first pin.</Text>}
              renderItem={({ item }) => (
                <Pressable accessibilityRole="link" onPress={() => onOpenListing(item)} style={styles.row}>
                  <Text style={styles.rowText}>
                    {LISTING_TYPE_LABELS[item.listingType]}: {item.title}
                  </Text>
                  <Text style={styles.rowDetail}>
                    {describeLocation(item)} · {describeAge(item.createdAt, now)}
                  </Text>
                </Pressable>
              )}
            />
          ) : null}
        </>
      ) : null}

      {!saving && view === "buildings" ? (
        <TextInput
          accessibilityLabel="Search buildings"
          placeholder="Search buildings"
          placeholderTextColor="#55636F"
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />
      ) : null}

      {!saving && view === "buildings" && (status === "loading" || status === "slow") ? (
        <View style={styles.state}>
          <ActivityIndicator color="#112E51" />
          <Text style={styles.stateText}>
            {status === "slow" ? "Waking the server. On the free hosting plan this can take a minute." : "Loading buildings…"}
          </Text>
        </View>
      ) : null}

      {!saving && view === "buildings" && status === "error" ? (
        <View style={styles.state}>
          <Text role="alert" style={styles.notice}>
            {errorMessage}
          </Text>
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!saving && view === "buildings" && status === "ready" ? (
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

function ViewChoice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" aria-checked={selected} onPress={onPress} style={[styles.view, selected && styles.viewSelected]}>
      <Text style={[styles.viewText, selected && styles.viewTextSelected]}>{label}</Text>
    </Pressable>
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
  rowDetail: { color: "#3C4A57", fontSize: 13, marginTop: 2 },
  saved: { backgroundColor: "#E6F4EA", borderRadius: 8, color: "#1E5631", fontSize: 14, padding: 10 },
  views: { flexDirection: "row", gap: 6 },
  view: { alignItems: "center", borderColor: "#112E51", borderRadius: 8, borderWidth: 1, flex: 1, paddingVertical: 6 },
  viewSelected: { backgroundColor: "#112E51" },
  viewText: { color: "#112E51", fontSize: 14, fontWeight: "600" },
  viewTextSelected: { color: "#FFFFFF" },
  legend: { flexDirection: "row", gap: 14 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 5 },
  legendDot: { borderRadius: 6, height: 12, width: 12 },
  legendText: { color: "#3C4A57", fontSize: 13 },
  secondaryButton: { alignSelf: "flex-start", borderColor: "#112E51", borderRadius: 8, borderWidth: 1, marginTop: 4, paddingHorizontal: 12, paddingVertical: 6 },
  secondaryButtonText: { color: "#112E51", fontSize: 14, fontWeight: "600" },
});
