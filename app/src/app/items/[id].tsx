import { useLocalSearchParams } from "expo-router";
import { ListingScreen } from "@/features/listings/ListingScreen";

/** One listing, such as `/items/42`. */
export default function ListingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ListingScreen id={Number(id)} />;
}
