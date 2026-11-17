import type { Listing, ListingCategory, ListingType } from "@/lib/api";

export const LISTING_TYPE_LABELS: Record<ListingType, string> = { LOST: "Lost", FOUND: "Found" };

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  PET: "Pet",
  ELECTRONICS: "Electronics",
  KEYS: "Keys",
  BOOKS: "Books",
  CLOTHING: "Clothing",
  OTHER: "Other",
};

/** Where a listing is, such as "Library, floor 2". */
export function describeLocation({ building, floor }: Pick<Listing, "building" | "floor">): string {
  return floor === null ? building.name : `${building.name}, floor ${floor}`;
}
