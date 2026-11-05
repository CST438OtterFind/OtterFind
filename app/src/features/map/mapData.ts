import type { Building } from "@/lib/api";
import { CAMPUS_ZONES, type Pin, type Zone } from "./campus";

/** The base map. OpenFreeMap needs no API key or sign-up. It offers no uptime guarantee, so this can be swapped. */
export const MAP_STYLE_URL = process.env.EXPO_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty";

/** How far the map zooms in when it moves to a building. */
export const FOCUS_ZOOM = 16.5;

/** Colors drawn on the map, shared so web and Android look the same. */
export const MAP_COLORS = {
  building: "#112E51",
  buildingOutline: "#FFFFFF",
  pin: "#C8102E",
  pinOutline: "#FFFFFF",
  mask: "#1B2A3A",
} as const;

export const MASK_OPACITY = 0.45;

/** Buildings as GeoJSON points. GeoJSON puts longitude first. */
export function buildingsToGeoJson(buildings: Building[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: buildings.map((building) => ({
      type: "Feature",
      properties: { id: building.id, name: building.name },
      geometry: { type: "Point", coordinates: [building.longitude, building.latitude] },
    })),
  };
}

/** The dropped pin as GeoJSON, or an empty collection if there isn't one. */
export function pinToGeoJson(pin: Pin | null): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: pin
      ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [pin.longitude, pin.latitude] } }]
      : [],
  };
}

const ring = ({ west, south, east, north }: Zone): GeoJSON.Position[] => [
  [west, south],
  [west, north],
  [east, north],
  [east, south],
  [west, south],
];

/** A shape covering the world with a hole for each campus zone, used to shade everything off campus. */
export function offCampusMask(): GeoJSON.Feature<GeoJSON.Polygon> {
  const world: GeoJSON.Position[] = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ];
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [world, ...CAMPUS_ZONES.map(ring)] },
  };
}
