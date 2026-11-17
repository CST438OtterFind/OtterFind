import { useLocalSearchParams } from "expo-router";
import { MapScreen } from "@/features/map/MapScreen";

/** The whole-campus map. `?item=42` opens it centered on that listing's pin (PRD-5). */
export default function MapRoute() {
  const { item } = useLocalSearchParams<{ item?: string }>();
  const focusListingId = item ? Number(item) : null;
  return <MapScreen focusListingId={Number.isInteger(focusListingId) ? focusListingId : null} />;
}
