import type { Building } from "@/lib/api";
import {
  CAMPUS_BOUNDS,
  WEB_CAMERA_BOUNDS,
  describePin,
  distanceMeters,
  filterBuildings,
  isOnCampus,
  nearestBuilding,
  pinFromBuilding,
  pinFromTap,
} from "./campus";

const library: Building = { id: 25, name: "Library", latitude: 36.65231, longitude: -121.79614 };
const studentCenter: Building = { id: 40, name: "Student Center", latitude: 36.65426, longitude: -121.79739 };
const buildings = [library, studentCenter];

describe("isOnCampus", () => {
  it("accepts a campus building", () => {
    expect(isOnCampus(library.latitude, library.longitude)).toBe(true);
  });

  it("accepts the far edge of the campus, such as the observatory", () => {
    expect(isOnCampus(36.66118, -121.80805)).toBe(true);
  });

  it.each([
    ["AAFES Express", 36.64508, -121.80641],
    ["Trader Joe's", 36.66428, -121.80978],
    ["Los Angeles", 34.05, -118.24],
  ])("rejects %s", (_name, latitude, longitude) => {
    expect(isOnCampus(latitude, longitude)).toBe(false);
  });
});

describe("distanceMeters", () => {
  it("is zero for the same point", () => {
    expect(distanceMeters(36.65, -121.79, 36.65, -121.79)).toBe(0);
  });

  it("measures a real distance on campus", () => {
    const meters = distanceMeters(library.latitude, library.longitude, studentCenter.latitude, studentCenter.longitude);
    expect(meters).toBeGreaterThan(235);
    expect(meters).toBeLessThan(255);
  });
});

describe("nearestBuilding", () => {
  it("finds the closest building and how far away it is", () => {
    const nearest = nearestBuilding(buildings, 36.6523, -121.7961);
    expect(nearest?.building).toBe(library);
    expect(nearest?.meters).toBeLessThan(10);
  });

  it("returns null when there are no buildings", () => {
    expect(nearestBuilding([], 36.6523, -121.7961)).toBeNull();
  });
});

describe("pinFromTap", () => {
  it("drops a pin on campus and names the nearest building", () => {
    const result = pinFromTap(36.6543, -121.7974, buildings);
    expect(result).toEqual({
      ok: true,
      pin: { latitude: 36.6543, longitude: -121.7974, building: studentCenter, meters: expect.any(Number) },
    });
  });

  it("still drops a pin when the building list hasn't loaded", () => {
    const result = pinFromTap(36.6543, -121.7974, []);
    expect(result).toEqual({ ok: true, pin: { latitude: 36.6543, longitude: -121.7974, building: null, meters: null } });
  });

  it("refuses a pin off campus and says why", () => {
    expect(pinFromTap(36.66428, -121.80978, buildings)).toEqual({
      ok: false,
      message: "That spot is off campus. Pins must be on the CSUMB campus.",
    });
  });
});

describe("pinFromBuilding", () => {
  it("puts the pin exactly on the building", () => {
    expect(pinFromBuilding(library)).toEqual({
      latitude: library.latitude,
      longitude: library.longitude,
      building: library,
      meters: 0,
    });
  });
});

describe("describePin", () => {
  const point = { latitude: 36.65, longitude: -121.79 };

  it("says a pin is at a building when it's exactly on it", () => {
    expect(describePin(pinFromBuilding(library))).toBe("At Library");
  });

  it("says how far away the nearest building is, in whole meters", () => {
    expect(describePin({ ...point, building: library, meters: 41.6 })).toBe("Near Library, 42 m away");
  });

  it("doesn't name a building when the list hasn't loaded", () => {
    expect(describePin({ ...point, building: null, meters: null })).toBe("On campus");
  });
});

describe("filterBuildings", () => {
  it("returns everything for a blank search", () => {
    expect(filterBuildings(buildings, "   ")).toEqual(buildings);
  });

  it("ignores case and surrounding spaces", () => {
    expect(filterBuildings(buildings, "  LIBR ")).toEqual([library]);
  });

  it("matches anywhere in the name", () => {
    expect(filterBuildings(buildings, "center")).toEqual([studentCenter]);
  });

  it("returns nothing when no name matches", () => {
    expect(filterBuildings(buildings, "zzz")).toEqual([]);
  });
});

describe("WEB_CAMERA_BOUNDS", () => {
  it("is padded past the campus on every side, so a phone can zoom out far enough to see all of it", () => {
    expect(WEB_CAMERA_BOUNDS.west).toBeLessThan(CAMPUS_BOUNDS.west);
    expect(WEB_CAMERA_BOUNDS.east).toBeGreaterThan(CAMPUS_BOUNDS.east);
    expect(WEB_CAMERA_BOUNDS.south).toBeLessThan(CAMPUS_BOUNDS.south);
    expect(WEB_CAMERA_BOUNDS.north).toBeGreaterThan(CAMPUS_BOUNDS.north);
  });
});
