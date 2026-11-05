import { useEffect, useRef, useState } from "react";
import { type GeoJSONSource, Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CAMPUS_BOUNDS, WEB_CAMERA_BOUNDS, type Zone } from "./campus";
import type { CampusMapProps } from "./CampusMap.types";
import { FOCUS_ZOOM, MAP_COLORS, MAP_STYLE_URL, MASK_OPACITY, buildingsToGeoJson, offCampusMask, pinToGeoJson } from "./mapData";

// Expo's web bundler doesn't ship this file, so scripts/copy-maplibre-worker.js puts it in public/.
setWorkerUrl("/maplibre-gl-worker.mjs");

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
const FIT_PADDING = 8;
/** Pixels around a click that still count as hitting a building marker. */
const TAP_TOLERANCE = 6;

const toBounds = ({ west, south, east, north }: Zone): [[number, number], [number, number]] => [
  [west, south],
  [east, north],
];

/** The campus map on web, drawn by maplibre-gl. */
export function CampusMap({ buildings, pin, focus, onPressMap, onPressBuilding }: CampusMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [loaded, setLoaded] = useState(false);

  // The map is created once, so its click handler reads the newest props from here.
  const latest = useRef({ buildings, onPressMap, onPressBuilding });
  latest.current = { buildings, onPressMap, onPressBuilding };

  useEffect(() => {
    const map = new MapLibreMap({
      container: container.current!,
      style: MAP_STYLE_URL,
      bounds: toBounds(CAMPUS_BOUNDS),
      fitBoundsOptions: { padding: FIT_PADDING },
      maxBounds: toBounds(WEB_CAMERA_BOUNDS),
      minZoom: 12,
      maxZoom: 19,
      dragRotate: false,
      attributionControl: { compact: false },
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("off-campus-mask", { type: "geojson", data: offCampusMask() });
      map.addLayer({
        id: "off-campus-mask",
        type: "fill",
        source: "off-campus-mask",
        paint: { "fill-color": MAP_COLORS.mask, "fill-opacity": MASK_OPACITY },
      });
      map.addSource("buildings", { type: "geojson", data: EMPTY });
      map.addLayer({
        id: "buildings",
        type: "circle",
        source: "buildings",
        paint: {
          "circle-radius": 6,
          "circle-color": MAP_COLORS.building,
          "circle-stroke-color": MAP_COLORS.buildingOutline,
          "circle-stroke-width": 2,
        },
      });
      map.addSource("pin", { type: "geojson", data: EMPTY });
      map.addLayer({
        id: "pin",
        type: "circle",
        source: "pin",
        paint: {
          "circle-radius": 10,
          "circle-color": MAP_COLORS.pin,
          "circle-stroke-color": MAP_COLORS.pinOutline,
          "circle-stroke-width": 3,
        },
      });
      setLoaded(true);
    });

    map.on("click", ({ point, lngLat }) => {
      const hits = map.getLayer("buildings")
        ? map.queryRenderedFeatures(
            [
              [point.x - TAP_TOLERANCE, point.y - TAP_TOLERANCE],
              [point.x + TAP_TOLERANCE, point.y + TAP_TOLERANCE],
            ],
            { layers: ["buildings"] },
          )
        : [];
      const building = latest.current.buildings.find((candidate) => candidate.id === hits[0]?.properties?.id);
      if (building) latest.current.onPressBuilding(building);
      else latest.current.onPressMap(lngLat.lat, lngLat.lng);
    });

    map.on("mouseenter", "buildings", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "buildings", () => {
      map.getCanvas().style.cursor = "";
    });

    return () => {
      mapRef.current = null;
      setLoaded(false);
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (loaded) mapRef.current?.getSource<GeoJSONSource>("buildings")?.setData(buildingsToGeoJson(buildings));
  }, [loaded, buildings]);

  useEffect(() => {
    if (loaded) mapRef.current?.getSource<GeoJSONSource>("pin")?.setData(pinToGeoJson(pin));
  }, [loaded, pin]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    if (focus.kind === "campus") map.fitBounds(toBounds(CAMPUS_BOUNDS), { padding: FIT_PADDING });
    else map.easeTo({ center: [focus.longitude, focus.latitude], zoom: FOCUS_ZOOM });
  }, [focus]);

  return <div ref={container} data-testid="campus-map" style={{ flex: 1, minHeight: 0, width: "100%" }} />;
}
