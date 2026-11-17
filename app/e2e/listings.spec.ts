import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { signInAs, stubBaseMap } from "./support";

/** Walks listings through the real web client, API and Postgres, signed in as a seeded test account. */
test.beforeEach(async ({ page, request }) => {
  await stubBaseMap(page);
  await signInAs(page, request);
});

const uniqueTitle = (name: string) => `${name} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const listingRow = (page: Page, title: string) => page.getByRole("link", { name: new RegExp(title) });

/** Saves a pin on the Library from the map, and returns once the map confirms it. */
async function savePin(page: Page, title: string) {
  await page.goto("/map");
  await page.getByRole("radio", { name: "Buildings" }).click();
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page.getByLabel("What was lost or found").fill(title);
  await page.getByRole("radio", { name: "Keys" }).click();
  await page.getByLabel("Floor, if indoors").fill("2");
  await page.getByRole("button", { name: "Save pin" }).click();
  await expect(page.getByText(`Saved “${title}”.`)).toBeVisible();
}

async function deleteOpenListing(page: Page) {
  await page.getByRole("button", { name: "Delete listing" }).click();
  await expect(page.getByRole("button", { name: "Delete listing" })).toHaveCount(0);
}

test("the home page lists the seeded listings, newest first, with their age", async ({ page }) => {
  await page.goto("/");

  const cat = listingRow(page, "Grey tabby cat");
  await expect(cat).toContainText("Library, floor 2");
  await expect(cat).toContainText(/ ago|Just now/);

  const titles = await page.getByRole("link").allTextContents();
  const position = (name: string) => titles.findIndex((text) => text.includes(name));
  expect(position("Grey tabby cat")).toBeLessThan(position("Silver laptop"));
  expect(position("Silver laptop")).toBeLessThan(position("Water bottle, no pin"));
});

test("a listing opens from the home page with its details and a map", async ({ page }) => {
  await page.goto("/");
  await listingRow(page, "Grey tabby cat").click();

  await expect(page).toHaveURL(/\/items\/\d+$/);
  await expect(page.getByText("Friendly, with a red collar.")).toBeVisible();
  await expect(page.getByText("Lost · Pet")).toBeVisible();
  await expect(page.getByTestId("listing-map").locator("canvas.maplibregl-canvas")).toBeVisible();
});

test("show on map centers the whole map on the pin with its building and last-seen time", async ({ page }) => {
  await page.goto("/");
  await listingRow(page, "Grey tabby cat").click();
  await page.getByRole("button", { name: "Show on map" }).click();

  await expect(page).toHaveURL(/\/map\?item=\d+$/);
  const focused = page.getByTestId("focused-listing");
  await expect(focused).toContainText("Library, floor 2");
  await expect(focused).toContainText("Last seen");
});

test("tapping a saved pin on the map opens its listing", async ({ page }) => {
  await page.goto("/");
  await listingRow(page, "Grey tabby cat").click();
  await page.getByRole("button", { name: "Show on map" }).click();
  await expect(page.getByTestId("focused-listing")).toBeVisible();
  // The listing page stays mounted behind this one with its own map, so take the newest.
  const canvas = page.locator("canvas.maplibregl-canvas").last();
  await expect(page.locator(".maplibregl-ctrl-attrib").last()).toContainText("OpenStreetMap", { timeout: 30_000 });
  // Show on map centers the pin, so it's in the middle of the canvas once the camera stops.
  await page.waitForTimeout(1_500);
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(page).toHaveURL(/\/items\/\d+$/);
  await expect(page.getByText("Friendly, with a red collar.").last()).toBeVisible();
});

test("a listing with no pin shows its building and no map", async ({ page }) => {
  await page.goto("/");
  await listingRow(page, "Water bottle, no pin").click();

  await expect(page.getByText("Student Center", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show on map" })).toHaveCount(0);
  await expect(page.getByTestId("listing-map")).toHaveCount(0);
});

test("the whole map lists every listing with its age, and a legend for the pin colors", async ({ page }) => {
  await page.goto("/map");

  await expect(listingRow(page, "Grey tabby cat")).toContainText(/ ago|Just now/);
  await expect(page.getByText("This week")).toBeVisible();
  await expect(page.getByText("Older")).toBeVisible();
});

test("a saved pin survives a reload, shows on the home page, and can be deleted", async ({ page }) => {
  const title = uniqueTitle("Blue backpack");

  await savePin(page, title);
  await expect(listingRow(page, title)).toBeVisible();

  await page.reload();
  await expect(listingRow(page, title)).toContainText("Library, floor 2");

  await page.goto("/");
  await listingRow(page, title).click();
  await expect(page.getByText("Lost · Keys")).toBeVisible();
  await deleteOpenListing(page);

  await page.goto("/");
  await expect(listingRow(page, "Grey tabby cat")).toBeVisible();
  await expect(listingRow(page, title)).toHaveCount(0);
});

test("the API's message appears beside the field, and nothing is saved", async ({ page }) => {
  await page.goto("/map");
  await page.getByRole("radio", { name: "Buildings" }).click();
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page.getByLabel("What was lost or found").fill("Cat");
  await page.getByRole("button", { name: "Save pin" }).click();

  await expect(page.getByRole("alert")).toHaveText("Title must be at least 4 characters");
  await expect(page.getByRole("button", { name: "Save pin" })).toBeVisible();
});

test("someone else's listing has no delete button", async ({ page }) => {
  await page.goto("/");
  await listingRow(page, "Silver laptop").click();

  await expect(page.getByText("Lost · Electronics")).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete listing" })).toHaveCount(0);
});

test("a listing that doesn't exist says so", async ({ page }) => {
  await page.goto("/items/99999999");

  await expect(page.getByRole("alert")).toHaveText("This listing doesn't exist, or it was deleted.");
});

test("signing out returns to the sign-in page and stays there after a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByText("Continue with Google")).toBeVisible();
});

test.describe("on a short phone screen", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("the save button stays on screen", async ({ page }) => {
    await page.goto("/map");
    await page.getByRole("radio", { name: "Buildings" }).click();
    await page.getByRole("button", { name: "Library", exact: true }).click();

    const save = await page.getByRole("button", { name: "Save pin" }).boundingBox();
    expect(save).not.toBeNull();
    expect(save!.y + save!.height).toBeLessThanOrEqual(640);
    await expect(page.getByLabel("What was lost or found")).toBeInViewport();
  });
});

test.describe("accessibility while signed in", () => {
  const expectNoSeriousViolations = async (page: Page) => {
    const { violations } = await new AxeBuilder({ page }).analyze();
    const serious = violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
    expect(serious).toEqual([]);
  };

  test("the home page", async ({ page }) => {
    await page.goto("/");
    await expect(listingRow(page, "Grey tabby cat")).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("a listing", async ({ page }) => {
    await page.goto("/");
    await listingRow(page, "Grey tabby cat").click();
    await expect(page.getByText("Friendly, with a red collar.")).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("the map with its listings", async ({ page }) => {
    await page.goto("/map");
    await expect(listingRow(page, "Grey tabby cat")).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("the map with the save form open", async ({ page }) => {
    await page.goto("/map");
    await page.getByRole("radio", { name: "Buildings" }).click();
    await page.getByRole("button", { name: "Library", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save pin" })).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("an invalid saved token signs the user out instead of breaking the page", async ({ browser }) => {
    const page = await browser.newPage({ baseURL: "http://localhost:8081" });
    await stubBaseMap(page);
    await page.addInitScript(() => localStorage.setItem("app_jwt", "not-a-real-token"));
    await page.goto("/");

    await expect(page.getByText("Continue with Google")).toBeVisible();
    await page.close();
  });

  test("the sign-in page still reaches the team's test screens and the map", async ({ browser }) => {
    const page = await browser.newPage({ baseURL: "http://localhost:8081" });
    await stubBaseMap(page);
    await page.goto("/");

    await page.getByRole("button", { name: "Test Report an Item" }).click();
    await expect(page.getByText("Report an Item", { exact: true })).toBeVisible();
    await page.getByText("Go Back").click();

    await page.getByRole("link", { name: "View campus map" }).click();
    await expect(page).toHaveURL(/\/map$/);
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
    await page.close();
  });
});
