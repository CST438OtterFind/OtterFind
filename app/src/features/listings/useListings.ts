import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { getListing, getListings, type Listing } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useRequest } from "@/lib/useRequest";

/** Loads every active listing while someone is signed in, and refreshes whenever its screen comes back into view. */
export function useListings() {
  const { status: sessionStatus } = useSession();
  const { data, status, error, retry } = useRequest(sessionStatus === "signedIn" ? getListings : null, "Something went wrong loading the listings.");
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      // The first focus happens as the screen opens, when the request above is already running.
      if (isFirstFocus.current) isFirstFocus.current = false;
      else retry();
    }, [retry]),
  );

  return { listings: data ?? ([] as Listing[]), status, errorMessage: error?.message ?? null, retry };
}

/** Loads one listing while someone is signed in. */
export function useListing(id: number) {
  const { status: sessionStatus } = useSession();
  const load = useCallback((options: { signal: AbortSignal }) => getListing(id, options), [id]);
  const { data, status, error, retry } = useRequest(sessionStatus === "signedIn" ? load : null, "Something went wrong loading this listing.");
  return { listing: data, status, error, retry };
}
