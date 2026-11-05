import type { Building } from "@/lib/api";
import type { Pin } from "./campus";

/** Asks the map to move. `nonce` changes on each request, so repeating the same request still moves it. */
export type FocusRequest =
  | { kind: "campus"; nonce: number }
  | { kind: "point"; latitude: number; longitude: number; nonce: number };

/** What both versions of the map accept. */
export type CampusMapProps = {
  buildings: Building[];
  pin: Pin | null;
  focus: FocusRequest | null;
  /** Called when the user taps the map anywhere other than a building marker. */
  onPressMap: (latitude: number, longitude: number) => void;
  /** Called when the user taps a building marker. */
  onPressBuilding: (building: Building) => void;
};
