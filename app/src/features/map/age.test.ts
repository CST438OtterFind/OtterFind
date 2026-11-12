import { ageBand } from "./age";

const now = Date.parse("2026-11-09T20:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

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

  it("treats a pin from slightly in the future as recent", () => {
    expect(ageBand(ago(-5 * 60_000), now)).toBe("today");
  });
});
