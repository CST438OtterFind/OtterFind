import type { Building } from "@/lib/api";

/** A rectangle on the map, in degrees. */
export type Zone = {
  west: number;
  south: number;
  east: number;
  north: number;
};

/** A place on campus chosen for a report. */
export type Pin = {
  latitude: number;
  longitude: number;
  /** The closest building, or null if the building list hasn't loaded. */
  building: Building | null;
  /** The distance to that building, or null if there isn't one. */
  meters: number | null;
};

/** OpenStreetMap's boundary for the main campus, rounded outward. */
const MAIN_CAMPUS: Zone = { west: -121.80947, south: 36.64632, east: -121.78564, north: 36.66136 };

/** Everywhere a pin may go. To allow another area, such as East Campus housing, add a zone here. */
export const CAMPUS_ZONES: Zone[] = [MAIN_CAMPUS];

/** The smallest rectangle around every zone. */
export const CAMPUS_BOUNDS: Zone = {
  west: Math.min(...CAMPUS_ZONES.map((zone) => zone.west)),
  south: Math.min(...CAMPUS_ZONES.map((zone) => zone.south)),
  east: Math.max(...CAMPUS_ZONES.map((zone) => zone.east)),
  north: Math.max(...CAMPUS_ZONES.map((zone) => zone.north)),
};

/**
 * The camera limit on web.
 *
 * On web, `maxBounds` limits the whole visible area, so at the exact campus limits a phone-sized
 * browser could only see about a third of the campus at once. This padding lets every screen shape
 * fit the whole campus, and the shaded mask shows the real edge. Android limits only the map's
 * center, so it uses {@link CAMPUS_BOUNDS} directly.
 */
export const WEB_CAMERA_BOUNDS: Zone = {
  west: CAMPUS_BOUNDS.west - 0.006,
  south: CAMPUS_BOUNDS.south - 0.0132,
  east: CAMPUS_BOUNDS.east + 0.006,
  north: CAMPUS_BOUNDS.north + 0.0132,
};

/** Whether a point is inside a campus zone. */
export function isOnCampus(latitude: number, longitude: number): boolean {
  return CAMPUS_ZONES.some(
    (zone) => latitude >= zone.south && latitude <= zone.north && longitude >= zone.west && longitude <= zone.east,
  );
}

const EARTH_RADIUS_METERS = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** The distance between two points in meters, using the haversine formula. */
export function distanceMeters(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number): number {
  const latitudeChange = toRadians(latitudeB - latitudeA);
  const longitudeChange = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(latitudeChange / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB)) * Math.sin(longitudeChange / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

/** Finds the building closest to a point, or null if the list is empty. */
export function nearestBuilding(
  buildings: Building[],
  latitude: number,
  longitude: number,
): { building: Building; meters: number } | null {
  let nearest: { building: Building; meters: number } | null = null;
  for (const building of buildings) {
    const meters = distanceMeters(latitude, longitude, building.latitude, building.longitude);
    if (!nearest || meters < nearest.meters) nearest = { building, meters };
  }
  return nearest;
}

/** Turns a tap on the map into a pin, or explains why it can't go there. */
export function pinFromTap(
  latitude: number,
  longitude: number,
  buildings: Building[],
): { ok: true; pin: Pin } | { ok: false; message: string } {
  if (!isOnCampus(latitude, longitude)) {
    return { ok: false, message: "That spot is off campus. Pins must be on the CSUMB campus." };
  }
  const nearest = nearestBuilding(buildings, latitude, longitude);
  return { ok: true, pin: { latitude, longitude, building: nearest?.building ?? null, meters: nearest?.meters ?? null } };
}

/** Puts a pin exactly on a building. */
export function pinFromBuilding(building: Building): Pin {
  return { latitude: building.latitude, longitude: building.longitude, building, meters: 0 };
}

/** Describes where a pin is, for the summary shown beside the map. */
export function describePin({ building, meters }: Pin): string {
  if (!building || meters === null) return "On campus";
  return meters === 0 ? `At ${building.name}` : `Near ${building.name}, ${Math.round(meters)} m away`;
}

/** Filters buildings by name, ignoring case and surrounding spaces. */
export function filterBuildings(buildings: Building[], search: string): Building[] {
  const query = search.trim().toLowerCase();
  return query ? buildings.filter((building) => building.name.toLowerCase().includes(query)) : buildings;
}
