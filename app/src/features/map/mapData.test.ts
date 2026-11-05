import type { Building } from "@/lib/api";
import { CAMPUS_ZONES } from "./campus";
import { buildingsToGeoJson, offCampusMask, pinToGeoJson } from "./mapData";

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
