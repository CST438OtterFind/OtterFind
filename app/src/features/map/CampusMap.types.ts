import type { Building } from "@/lib/api";
import type { Pin } from "./campus";

/** Asks the map to move. `nonce` changes on each request, so repeating the same request still moves it. */
export type FocusRequest =
  | { kind: "campus"; nonce: number }
  | { kind: "point"; latitude: number; longitude: number; nonce: number };

/**
 * A saved pin the map can draw. Any listing with these fields fits, so the map doesn't depend on how the
 * listings code describes the rest of a listing.
 */
export type MapListing = {
  id: number;
  /** Null when the listing has no map pin. */
  latitude: number | null;
  longitude: number | null;
  /** When it was posted, as an ISO 8601 timestamp. The pin's color shows its age. */
  createdAt: string;
};

/** What both versions of the map accept. */
export type CampusMapProps = {
  buildings: Building[];
  pin: Pin | null;
  focus: FocusRequest | null;
  /** Saved listings to draw. Those with no pin are skipped. */
  listings: MapListing[];
  /** The current time, for coloring listings by age. */
  now: number;
  /** Called when the user taps the map anywhere other than a building marker. */
  onPressMap: (latitude: number, longitude: number) => void;
  /** Called when the user taps a building marker. */
  onPressBuilding: (building: Building) => void;
  /** Called with a listing's ID when the user taps its pin. Without it, tapping a pin is the same as tapping the map. */
  onPressListing?: (id: number) => void;
};
