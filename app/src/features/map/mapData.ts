import type { ExpressionSpecification } from "maplibre-gl";
import type { Building } from "@/lib/api";
import { type AgeBand, ageBand } from "./age";
import { CAMPUS_ZONES, type Pin, type Zone } from "./campus";
import type { MapListing } from "./CampusMap.types";

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

/**
 * Saved pins are colored by age. Color must never be the only signal, so whatever lists the pins beside the
 * map should spell the age out too.
 */
export const LISTING_AGE_COLORS: Record<AgeBand, string> = { today: "#E8590C", week: "#1971C2", older: "#6C757D" };

/** Tells the map to read each saved pin's color from its age group. */
export const LISTING_COLOR: ExpressionSpecification = [
  "match",
  ["get", "band"],
  "today",
  LISTING_AGE_COLORS.today,
  "week",
  LISTING_AGE_COLORS.week,
  LISTING_AGE_COLORS.older,
];

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

/** Saved listings as GeoJSON points, each with its age group. Listings with no pin are left out. */
export function listingsToGeoJson(listings: MapListing[], now: number): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: listings.flatMap((listing) =>
      listing.latitude === null || listing.longitude === null
        ? []
        : [
            {
              type: "Feature" as const,
              properties: { id: listing.id, band: ageBand(listing.createdAt, now) },
              geometry: { type: "Point" as const, coordinates: [listing.longitude, listing.latitude] },
            },
          ],
    ),
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
