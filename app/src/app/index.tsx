import { MapScreen } from "@/features/map/MapScreen";

/** The app opens on the campus map for now. Once sign-in exists, PRD-1 sends signed-in users to the feed. */
export default function Index() {
  return <MapScreen />;
}
