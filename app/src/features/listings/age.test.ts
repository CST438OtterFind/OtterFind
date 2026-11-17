import { ageBand, describeAge } from "./age";

const now = Date.parse("2026-11-09T20:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("describeAge", () => {
  it.each([
    [30_000, "Just now"],
    [MINUTE, "1 minute ago"],
    [59 * MINUTE, "59 minutes ago"],
    [HOUR, "1 hour ago"],
    [23 * HOUR, "23 hours ago"],
    [DAY, "1 day ago"],
    [6 * DAY, "6 days ago"],
    [7 * DAY, "1 week ago"],
    [40 * DAY, "5 weeks ago"],
  ])("describes %d ms as %s", (elapsed, expected) => {
    expect(describeAge(ago(elapsed), now)).toBe(expected);
  });

  it("says just now when the phone's clock is behind the server's", () => {
    expect(describeAge(ago(-5 * MINUTE), now)).toBe("Just now");
  });

  it("doesn't show nonsense for a bad timestamp", () => {
    expect(describeAge("not a date", now)).toBe("Just now");
  });
});

describe("ageBand", () => {
  it.each([
    [HOUR, "today"],
    [DAY - 1, "today"],
    [DAY, "week"],
    [7 * DAY - 1, "week"],
    [7 * DAY, "older"],
  ])("puts %d ms in %s", (elapsed, expected) => {
    expect(ageBand(ago(elapsed), now)).toBe(expected);
  });

  it("treats a bad timestamp as recent, so the pin still draws", () => {
    expect(ageBand("not a date", now)).toBe("today");
  });
});
