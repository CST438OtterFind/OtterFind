import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, deleteListing } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { Pin } from "@/features/map/campus";
import { CampusMap } from "@/features/map/CampusMap";
import type { FocusRequest } from "@/features/map/CampusMap.types";
import { useBuildings } from "@/features/map/useBuildings";
import { describeAge } from "./age";
import { CATEGORY_LABELS, describeLocation, LISTING_TYPE_LABELS } from "./labels";
import { useListing } from "./useListings";
import { useNow } from "./useNow";

const noop = () => {};

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

/** One listing, with a map centered on its pin. A listing with no pin shows its building only (PRD-5). */
export function ListingScreen({ id }: { id: number }) {
  const { status: sessionStatus } = useSession();
  const { listing, status, error, retry } = useListing(id);
  const { buildings } = useBuildings();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const now = useNow();
  const insets = useSafeAreaInsets();

  const hasPin = listing?.latitude != null && listing.longitude != null;
  const pin = useMemo<Pin | null>(
    () => (listing?.latitude != null && listing.longitude != null ? { latitude: listing.latitude, longitude: listing.longitude, building: null, meters: null } : null),
    [listing?.latitude, listing?.longitude],
  );

  const focus = useMemo<FocusRequest | null>(() => (pin ? { kind: "point", latitude: pin.latitude, longitude: pin.longitude, nonce: 1 } : null), [pin]);

  const remove = async () => {
    setDeleteError(null);
    try {
      await deleteListing(id);
      goBack();
    } catch (caught) {
      setDeleteError(caught instanceof ApiError ? caught.message : "Something went wrong deleting this listing.");
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable accessibilityRole="button" onPress={goBack}>
          <Text style={styles.headerLink}>Back</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Listing
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {sessionStatus === "signedOut" ? <Text style={styles.stateText}>Sign in to see this listing.</Text> : null}

        {status === "loading" || status === "slow" ? <ActivityIndicator color="#112E51" /> : null}

        {status === "error" ? (
          <View style={styles.state}>
            <Text role="alert" style={styles.error}>
              {error?.status === 404 ? "This listing doesn't exist, or it was deleted." : error?.message}
            </Text>
            {error?.status === 404 ? null : (
              <Pressable accessibilityRole="button" onPress={retry} style={styles.button}>
                <Text style={styles.buttonText}>Try again</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {listing ? (
          <>
            <Text style={styles.title}>{listing.title}</Text>
            <Text style={styles.detail}>
              {LISTING_TYPE_LABELS[listing.listingType]} · {CATEGORY_LABELS[listing.category]}
            </Text>
            <Text style={styles.detail}>{describeLocation(listing)}</Text>
            <Text style={styles.detail}>Posted {describeAge(listing.createdAt, now)}</Text>
            <Text style={styles.detail}>Last seen {new Date(listing.lastSeenAt).toLocaleString()}</Text>
            {listing.description ? <Text style={styles.description}>{listing.description}</Text> : null}

            {hasPin ? (
              <>
                <View testID="listing-map" style={styles.map}>
                  <CampusMap buildings={buildings} pin={pin} focus={focus} listings={[]} now={now} onPressMap={noop} onPressBuilding={noop} onPressListing={noop} />
                </View>
                <Pressable accessibilityRole="button" onPress={() => router.push(`/map?item=${listing.id}`)} style={styles.button}>
                  <Text style={styles.buttonText}>Show on map</Text>
                </Pressable>
              </>
            ) : null}

            {listing.mine ? (
              <Pressable accessibilityRole="button" onPress={() => void remove()} style={styles.dangerButton}>
                <Text style={styles.dangerButtonText}>Delete listing</Text>
              </Pressable>
            ) : null}
            {deleteError ? (
              <Text role="alert" style={styles.error}>
                {deleteError}
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FFFFFF", flex: 1 },
  header: { alignItems: "center", backgroundColor: "#112E51", flexDirection: "row", justifyContent: "space-between", paddingBottom: 10, paddingHorizontal: 14 },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  headerLink: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  headerSpacer: { width: 32 },
  content: { gap: 8, padding: 16 },
  state: { gap: 8 },
  stateText: { color: "#3C4A57", fontSize: 14 },
  title: { color: "#112E51", fontSize: 24, fontWeight: "700" },
  detail: { color: "#3C4A57", fontSize: 15 },
  description: { color: "#112E51", fontSize: 15, marginTop: 8 },
  map: { borderRadius: 8, height: 260, marginTop: 8, overflow: "hidden" },
  error: { backgroundColor: "#FBE9EC", borderRadius: 8, color: "#8A0B20", fontSize: 14, padding: 10 },
  button: { alignSelf: "flex-start", borderColor: "#112E51", borderRadius: 8, borderWidth: 1, marginTop: 4, paddingHorizontal: 12, paddingVertical: 8 },
  buttonText: { color: "#112E51", fontSize: 14, fontWeight: "600" },
  dangerButton: { alignSelf: "flex-start", borderColor: "#8A0B20", borderRadius: 8, borderWidth: 1, marginTop: 16, paddingHorizontal: 12, paddingVertical: 8 },
  dangerButtonText: { color: "#8A0B20", fontSize: 14, fontWeight: "600" },
});
