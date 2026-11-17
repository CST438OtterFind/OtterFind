import { describeLocation } from "./labels";

const building = { id: 25, name: "Library" };

describe("describeLocation", () => {
  it("includes the floor when there is one", () => {
    expect(describeLocation({ building, floor: 2 })).toBe("Library, floor 2");
  });

  it("names floor 0 instead of treating it as no floor", () => {
    expect(describeLocation({ building, floor: 0 })).toBe("Library, floor 0");
  });

  it("shows only the building when there's no floor", () => {
    expect(describeLocation({ building, floor: null })).toBe("Library");
  });
});
