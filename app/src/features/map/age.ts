const DAY_MS = 24 * 60 * 60_000;
const WEEK_MS = 7 * DAY_MS;

/** How old a saved pin is, in the groups the map colors pins by. */
export type AgeBand = "today" | "week" | "older";

/** Sorts a timestamp into an age group: under a day, under a week, or older. */
export function ageBand(timestamp: string, now: number): AgeBand {
  const elapsed = now - Date.parse(timestamp);
  // A bad timestamp, or a phone clock a little behind the server's, still draws the pin.
  if (Number.isNaN(elapsed) || elapsed < DAY_MS) return "today";
  return elapsed < WEEK_MS ? "week" : "older";
}
