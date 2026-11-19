import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListings } from "@/features/listings/useListings";
import { useNow } from "@/features/listings/useNow";
import type { Building, Listing } from "@/lib/api";
import { useSession } from "@/lib/session";
import { type Pin, pinFromBuilding, pinFromTap } from "./campus";
import { CampusMap } from "./CampusMap";
import type { FocusRequest } from "./CampusMap.types";
import { MapPanel } from "./MapPanel";
import { useBuildings } from "./useBuildings";

/** Screens at least this wide show the panel beside the map instead of under it. */
const WIDE_LAYOUT_MIN_WIDTH = 768;

const openListing = (listing: Listing) => router.push(`/items/${listing.id}`);

/**
 * The whole-campus map: every saved pin colored by age, the buildings, and a pin you can name and save.
 *
 * @param focusListingId - A listing to center on, for PRD-5's "Show on map".
 */
export function MapScreen({ focusListingId = null }: { focusListingId?: number | null }) {
  const { buildings, status, errorMessage, retry } = useBuildings();
  const { status: sessionStatus } = useSession();
  const { listings, status: listingsStatus, errorMessage: listingsError, retry: retryListings } = useListings();
  const now = useNow();
  const [pin, setPin] = useState<Pin | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const nonce = useRef(0);
  const centeredOn = useRef<number | null>(null);

  const focusedListing = useMemo(() => listings.find((listing) => listing.id === focusListingId) ?? null, [listings, focusListingId]);

  useEffect(() => {
    if (focusedListing?.latitude == null || focusedListing.longitude == null || centeredOn.current === focusedListing.id) return;
    centeredOn.current = focusedListing.id;
    nonce.current += 1;
    setFocus({ kind: "point", latitude: focusedListing.latitude, longitude: focusedListing.longitude, nonce: nonce.current });
  }, [focusedListing]);

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= WIDE_LAYOUT_MIN_WIDTH;
  // The save form needs more room than the lists, especially with the keyboard open.
  const savingPin = sessionStatus === "signedIn" && pin !== null;

  // The map shrinks to make room for the save form on a phone, which could push the pin out of view.
  useEffect(() => {
    if (!savingPin || wide || !pin) return;
    nonce.current += 1;
    const next = nonce.current;
    setFocus((current) => {
      const alreadyThere = current?.kind === "point" && current.latitude === pin.latitude && current.longitude === pin.longitude;
      return alreadyThere ? { ...current, nonce: next } : { kind: "point", latitude: pin.latitude, longitude: pin.longitude, nonce: next, keepZoom: true };
    });
  }, [savingPin, wide, pin]);

  const chooseBuilding = useCallback((building: Building) => {
    setPin(pinFromBuilding(building));
    setNotice(null);
    setSavedMessage(null);
    nonce.current += 1;
    setFocus({ kind: "point", latitude: building.latitude, longitude: building.longitude, nonce: nonce.current });
  }, []);

  const tapMap = useCallback(
    (latitude: number, longitude: number) => {
      const result = pinFromTap(latitude, longitude, buildings);
      if (result.ok) {
        setPin(result.pin);
        setNotice(null);
        setSavedMessage(null);
      } else {
        setNotice(result.message);
      }
    },
    [buildings],
  );

  const pinSaved = useCallback(
    (listing: Listing) => {
      setPin(null);
      setSavedMessage(`Saved “${listing.title}”.`);
      retryListings();
    },
    [retryListings],
  );

  const showWholeCampus = useCallback(() => {
    nonce.current += 1;
    setFocus({ kind: "campus", nonce: nonce.current });
  }, []);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
            onPress={() => router.replace("/")}
            style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <View style={styles.headerCenter} pointerEvents="none">
          <Text accessibilityRole="header" style={styles.title}>
            OtterFind
          </Text>
          <Text style={styles.subtitle}>Campus map</Text>
        </View>
        <Pressable
            accessibilityRole="button"
            onPress={showWholeCampus}
            style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>Show whole campus</Text>
        </Pressable>
      </View>
      {/* Lifts the save form above the phone's keyboard. Android apps draw behind the keyboard by default. */}
      <KeyboardAvoidingView behavior="padding" style={[styles.body, wide && styles.bodyWide]}>
        <View style={styles.map}>
          <CampusMap
            buildings={buildings}
            pin={pin}
            focus={focus}
            listings={listings}
            now={now}
            onPressMap={tapMap}
            onPressBuilding={chooseBuilding}
            onPressListing={openListing}
          />
        </View>
        <MapPanel
          buildings={buildings}
          status={status}
          errorMessage={errorMessage}
          onRetry={retry}
          pin={pin}
          notice={notice}
          onChooseBuilding={chooseBuilding}
          onClearPin={() => {
            setPin(null);
            setNotice(null);
          }}
          signedIn={sessionStatus === "signedIn"}
          listings={listings}
          listingsStatus={listingsStatus}
          listingsError={listingsError}
          onRetryListings={retryListings}
          focusedListing={focusedListing}
          savedMessage={savedMessage}
          now={now}
          onSaved={pinSaved}
          onOpenListing={openListing}
          style={wide ? styles.panelWide : [savingPin ? styles.panelNarrowSaving : styles.panelNarrow, { paddingBottom: insets.bottom + 12 }]}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FFFFFF", flex: 1 },
  header: {
    alignItems: "center",
    backgroundColor: "#112E51",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 10,
    paddingHorizontal: 14,
    minHeight: 70,
  },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  subtitle: { color: "#DCE6F1", fontSize: 13 },
  headerButton: { borderColor: "#FFFFFF", borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  headerButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  body: { flex: 1 },
  bodyWide: { flexDirection: "row-reverse" },
  map: { flex: 1, minHeight: 0 },
  panelWide: { width: 360 },
  panelNarrow: { height: "46%" },
  panelNarrowSaving: { height: "72%" },
  backButton: { borderColor: "#FFFFFF", borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, zIndex: 1,},
  backButtonText: {color: "#FFFFFF", fontSize: 13, fontWeight: "600",},
  headerCenter: { position: "absolute", left: 0, right: 0, bottom: 10, alignItems: "center",},
});
