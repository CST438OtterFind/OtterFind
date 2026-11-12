import type { Building } from "@/lib/api";
import { CAMPUS_ZONES } from "./campus";
import type { MapListing } from "./CampusMap.types";
import { buildingsToGeoJson, listingsToGeoJson, offCampusMask, pinToGeoJson } from "./mapData";

const library: Building = { id: 25, name: "Library", latitude: 36.65231, longitude: -121.79614 };

describe("buildingsToGeoJson", () => {
  it("puts longitude first, as GeoJSON requires", () => {
    const [feature] = buildingsToGeoJson([library]).features;
    expect(feature.geometry).toEqual({ type: "Point", coordinates: [-121.79614, 36.65231] });
  });

  it("keeps the id and name so a tapped marker can be matched to its building", () => {
    const [feature] = buildingsToGeoJson([library]).features;
    expect(feature.properties).toEqual({ id: 25, name: "Library" });
  });

  it("is an empty collection when there are no buildings", () => {
    expect(buildingsToGeoJson([])).toEqual({ type: "FeatureCollection", features: [] });
  });
});

describe("pinToGeoJson", () => {
  it("is an empty collection with no pin", () => {
    expect(pinToGeoJson(null)).toEqual({ type: "FeatureCollection", features: [] });
  });

  it("is one point at the pin, longitude first", () => {
    const pin = { latitude: 36.65, longitude: -121.79, building: null, meters: null };
    expect(pinToGeoJson(pin).features[0].geometry).toEqual({ type: "Point", coordinates: [-121.79, 36.65] });
  });
});

describe("offCampusMask", () => {
  const rings = () => {
    const { geometry } = offCampusMask();
    if (geometry.type !== "Polygon") throw new Error(`Expected a polygon, got ${geometry.type}`);
    return geometry.coordinates;
  };

  it("has an outer ring plus one hole for each campus zone", () => {
    expect(rings()).toHaveLength(1 + CAMPUS_ZONES.length);
  });

  it("closes every ring, which GeoJSON requires", () => {
    for (const ring of rings()) {
      expect(ring[0]).toEqual(ring[ring.length - 1]);
    }
  });

  it("cuts the hole at the campus corners", () => {
    const [, hole] = rings();
    const [zone] = CAMPUS_ZONES;
    expect(hole).toContainEqual([zone.west, zone.south]);
    expect(hole).toContainEqual([zone.east, zone.north]);
  });
});

describe("listingsToGeoJson", () => {
  const now = Date.parse("2026-11-09T20:00:00Z");
  const listing = (id: number, createdAt: string, latitude: number | null = 36.65231, longitude: number | null = -121.79614): MapListing => ({
    id,
    createdAt,
    latitude,
    longitude,
  });

  it("puts longitude first and keeps the id, so a tapped pin can be matched to its listing", () => {
    const [feature] = listingsToGeoJson([listing(7, "2026-11-09T19:00:00Z")], now).features;
    expect(feature.geometry).toEqual({ type: "Point", coordinates: [-121.79614, 36.65231] });
    expect(feature.properties?.id).toBe(7);
  });

  it("groups pins by age, for their color", () => {
    const features = listingsToGeoJson(
      [listing(1, "2026-11-09T19:00:00Z"), listing(2, "2026-11-06T20:00:00Z"), listing(3, "2026-10-01T20:00:00Z")],
      now,
    ).features;
    expect(features.map((feature) => feature.properties?.band)).toEqual(["today", "week", "older"]);
  });

  it("leaves out a listing with no pin", () => {
    expect(listingsToGeoJson([listing(1, "2026-11-09T19:00:00Z", null, null)], now).features).toEqual([]);
  });

  it("draws nothing while there are no listings yet", () => {
    expect(listingsToGeoJson([], now).features).toEqual([]);
  });
});
