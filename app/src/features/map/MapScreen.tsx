import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Building } from "@/lib/api";
import { useNow } from "@/lib/useNow";
import { type Pin, pinFromBuilding, pinFromTap } from "./campus";
import { CampusMap } from "./CampusMap";
import type { FocusRequest, MapListing } from "./CampusMap.types";
import { MapPanel } from "./MapPanel";
import { useBuildings } from "./useBuildings";

/** Screens at least this wide show the panel beside the map instead of under it. */
const WIDE_LAYOUT_MIN_WIDTH = 768;

/**
 * PLACEHOLDER until the listings work (#12, #16) lands. Replace it with the active listings, and the map draws
 * each one's pin, colored by age. Any listing with the fields in `MapListing` fits. Then pass `onPressListing`
 * to `CampusMap` so a pin opens its listing.
 */
const NO_LISTINGS_YET: MapListing[] = [];

/**
 * The campus map: a campus-limited map, its buildings, and a test pin. Pins aren't saved yet. The
 * "post a lost item" form in PRD-4 will reuse this pin choice.
 */
export function MapScreen() {
  const { buildings, status, errorMessage, retry } = useBuildings();
  const now = useNow();
  const [pin, setPin] = useState<Pin | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const nonce = useRef(0);

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= WIDE_LAYOUT_MIN_WIDTH;

  const chooseBuilding = useCallback((building: Building) => {
    setPin(pinFromBuilding(building));
    setNotice(null);
    nonce.current += 1;
    setFocus({ kind: "point", latitude: building.latitude, longitude: building.longitude, nonce: nonce.current });
  }, []);

  const tapMap = useCallback(
    (latitude: number, longitude: number) => {
      const result = pinFromTap(latitude, longitude, buildings);
      if (result.ok) {
        setPin(result.pin);
        setNotice(null);
      } else {
        setNotice(result.message);
      }
    },
    [buildings],
  );

  const showWholeCampus = useCallback(() => {
    nonce.current += 1;
    setFocus({ kind: "campus", nonce: nonce.current });
  }, []);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            OtterFind
          </Text>
          <Text style={styles.subtitle}>Campus map</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={showWholeCampus} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Show whole campus</Text>
        </Pressable>
      </View>
      <View style={[styles.body, wide && styles.bodyWide]}>
        <View style={styles.map}>
          <CampusMap
            buildings={buildings}
            pin={pin}
            focus={focus}
            listings={NO_LISTINGS_YET}
            now={now}
            onPressMap={tapMap}
            onPressBuilding={chooseBuilding}
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
          style={wide ? styles.panelWide : [styles.panelNarrow, { paddingBottom: insets.bottom + 12 }]}
        />
      </View>
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
});
