import { useEffect, useMemo, useRef } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Camera, type CameraRef, GeoJSONSource, Layer, Map as MapLibreMap } from "@maplibre/maplibre-react-native";
import { CAMPUS_BOUNDS } from "./campus";
import type { CampusMapProps } from "./CampusMap.types";
import { FOCUS_ZOOM, LISTING_COLOR, MAP_COLORS, MAP_STYLE_URL, MASK_OPACITY, buildingsToGeoJson, listingsToGeoJson, offCampusMask, pinToGeoJson } from "./mapData";

const { west, south, east, north } = CAMPUS_BOUNDS;
const CAMPUS: [number, number, number, number] = [west, south, east, north];

/** The campus map on Android, drawn by MapLibre Native. */
export function CampusMap({ buildings, pin, focus, listings, now, onPressMap, onPressBuilding, onPressListing }: CampusMapProps) {
  const camera = useRef<CameraRef>(null);
  const mask = useMemo(() => offCampusMask(), []);
  const buildingData = useMemo(() => buildingsToGeoJson(buildings), [buildings]);
  const listingData = useMemo(() => listingsToGeoJson(listings, now), [listings, now]);
  const pinData = useMemo(() => pinToGeoJson(pin), [pin]);

  useEffect(() => {
    if (!focus) return;
    if (focus.kind === "campus") camera.current?.fitBounds(CAMPUS, { duration: 500 });
    else camera.current?.easeTo({ center: [focus.longitude, focus.latitude], zoom: FOCUS_ZOOM, duration: 500 });
  }, [focus]);

  return (
    <View style={styles.container}>
      <MapLibreMap
        testID="campus-map"
        style={styles.map}
        mapStyle={MAP_STYLE_URL}
        onPress={(event) => {
          const [longitude, latitude] = event.nativeEvent.lngLat;
          onPressMap(latitude, longitude);
        }}
      >
        {/* On Android, maxBounds limits only the map's center, so the mask below shows the real edge. */}
        <Camera initialViewState={{ bounds: CAMPUS }} ref={camera} minZoom={13.5} maxZoom={19} maxBounds={CAMPUS} />
        <GeoJSONSource id="off-campus-mask" data={mask}>
          <Layer id="off-campus-mask" type="fill" paint={{ "fill-color": MAP_COLORS.mask, "fill-opacity": MASK_OPACITY }} />
        </GeoJSONSource>
        <GeoJSONSource
          id="buildings"
          data={buildingData}
          onPress={(event) => {
            const id = event.nativeEvent.features[0]?.properties?.id;
            const building = buildings.find((candidate) => candidate.id === id);
            if (!building) return;
            event.stopPropagation();
            onPressBuilding(building);
          }}
        >
          <Layer
            id="buildings"
            type="circle"
            paint={{
              "circle-radius": 6,
              "circle-color": MAP_COLORS.building,
              "circle-stroke-color": MAP_COLORS.buildingOutline,
              "circle-stroke-width": 2,
            }}
          />
        </GeoJSONSource>
        <GeoJSONSource
          id="listings"
          data={listingData}
          onPress={
            onPressListing &&
            ((event) => {
              const id = event.nativeEvent.features[0]?.properties?.id;
              const listing = listings.find((candidate) => candidate.id === id);
              if (!listing) return;
              event.stopPropagation();
              onPressListing(listing.id);
            })
          }
        >
          <Layer
            id="listings"
            type="circle"
            paint={{
              "circle-radius": 8,
              "circle-color": LISTING_COLOR,
              "circle-stroke-color": MAP_COLORS.buildingOutline,
              "circle-stroke-width": 2,
            }}
          />
        </GeoJSONSource>
        <GeoJSONSource id="pin" data={pinData}>
          <Layer
            id="pin"
            type="circle"
            paint={{
              "circle-radius": 10,
              "circle-color": MAP_COLORS.pin,
              "circle-stroke-color": MAP_COLORS.pinOutline,
              "circle-stroke-width": 3,
            }}
          />
        </GeoJSONSource>
      </MapLibreMap>
      {/* MapLibre hides its credit behind a button on Android, so this keeps the OpenStreetMap credit visible. */}
      <Pressable
        accessibilityRole="link"
        onPress={() => Linking.openURL("https://www.openstreetmap.org/copyright")}
        style={styles.credit}
      >
        <Text style={styles.creditText}>© OpenStreetMap contributors</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  credit: {
    position: "absolute",
    right: 0,
    top: 0,
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  creditText: { color: "#112E51", fontSize: 11 },
});
