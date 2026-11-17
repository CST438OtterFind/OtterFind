const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

/** How old a listing is, in the groups the map colors its pins by. */
export type AgeBand = "today" | "week" | "older";

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"} ago`;

/** Time since a timestamp, for reading on screen, such as "3 hours ago". */
export function describeAge(timestamp: string, now: number): string {
  const elapsed = now - Date.parse(timestamp);
  // A negative age means the phone's clock is a little behind the server's.
  if (Number.isNaN(elapsed) || elapsed < MINUTE_MS) return "Just now";
  if (elapsed < HOUR_MS) return plural(Math.floor(elapsed / MINUTE_MS), "minute");
  if (elapsed < DAY_MS) return plural(Math.floor(elapsed / HOUR_MS), "hour");
  if (elapsed < WEEK_MS) return plural(Math.floor(elapsed / DAY_MS), "day");
  return plural(Math.floor(elapsed / WEEK_MS), "week");
}

/** Sorts a timestamp into an age group: under a day, under a week, or older. */
export function ageBand(timestamp: string, now: number): AgeBand {
  const elapsed = now - Date.parse(timestamp);
  if (Number.isNaN(elapsed) || elapsed < DAY_MS) return "today";
  return elapsed < WEEK_MS ? "week" : "older";
}
