import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

/**
 * Walks the Sprint 1 map through the real web client and the real API, so `docker compose up` must be
 * running. The base map is stubbed, so a slow or down tile provider can't fail these tests.
 */
const STUB_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      attribution: "Data from OpenStreetMap",
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#F7F5F0" } },
    // MapLibre only credits a source that a layer draws.
    { id: "osm", type: "circle", source: "osm" },
  ],
};

async function canvasBox(page: Page) {
  const box = await page.locator("canvas.maplibregl-canvas").boundingBox();
  if (!box) throw new Error("The map canvas isn't on screen");
  return box;
}

/** Taps a spot on campus with no building marker. Assumes the whole-campus view at the default screen size. */
async function tapEmptySpotOnCampus(page: Page) {
  const box = await canvasBox(page);
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.87);
}

/** Drags the map as far southeast as it will go. Starts clear of the credit in the bottom-right corner. */
async function dragTowardSoutheast(page: Page) {
  const box = await canvasBox(page);
  for (let drag = 0; drag < 8; drag += 1) {
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.8);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.05, box.y + box.height * 0.05, { steps: 5 });
    await page.waitForTimeout(100);
    await page.mouse.up();
  }
  await page.waitForTimeout(1_000);
}

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  // A map whose worker file is missing logs its failure here and otherwise looks fine. The browser also
  // logs each failed request here, which is expected in the test that makes the API fail on purpose.
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text());
  });

  await page.route("https://tiles.openfreemap.org/**", (route) => route.fulfill({ json: STUB_STYLE }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Library", exact: true })).toBeVisible({ timeout: 30_000 });
  // The map only reacts to clicks once its style has loaded and its credit is drawn.
  await expect(page.locator(".maplibregl-ctrl-attrib")).toContainText("OpenStreetMap", { timeout: 30_000 });
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test("shows the campus map with buildings from the API", async ({ page }) => {
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Student Center", exact: true })).toBeVisible();
});

test("has a page title", async ({ page }) => {
  await expect(page).toHaveTitle(/OtterFind/);
});

test("choosing a building drops a pin on it", async ({ page }) => {
  await page.getByRole("button", { name: "Library", exact: true }).click();

  const summary = page.getByTestId("pin-summary");
  await expect(summary).toContainText("At Library");
  await expect(summary).toContainText("36.65231, -121.79614");
});

test("search narrows the building list", async ({ page }) => {
  await page.getByLabel("Search buildings").fill("libr");

  await expect(page.getByRole("button", { name: "Library", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Student Center", exact: true })).toHaveCount(0);
});

test("search with no match says so", async ({ page }) => {
  await page.getByLabel("Search buildings").fill("zzz");

  await expect(page.getByText("No buildings match")).toBeVisible();
});

test("tapping the map on campus drops a pin and names the nearest building", async ({ page }) => {
  await tapEmptySpotOnCampus(page);

  await expect(page.getByTestId("pin-summary")).toContainText(/Near .+ m away/);
});

test("tapping a building marker puts the pin on that building", async ({ page }) => {
  // The middle of the whole-campus view has a marker on it at this screen size.
  const box = await canvasBox(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(page.getByTestId("pin-summary")).toContainText(/^At /);
});

test("tapping off campus refuses the pin and explains why", async ({ page }) => {
  const box = await canvasBox(page);
  await page.mouse.click(box.x + box.width / 2, box.y + 4);

  await expect(page.getByRole("alert")).toHaveText("That spot is off campus. Pins must be on the CSUMB campus.");
  await expect(page.getByTestId("pin-summary")).toContainText("Choose a building");
});

test("clearing a pin removes it", async ({ page }) => {
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page.getByRole("button", { name: "Clear pin" }).click();

  await expect(page.getByTestId("pin-summary")).toContainText("Choose a building");
});

test("dragging moves the map but stops at the campus limit", async ({ page }) => {
  await dragTowardSoutheast(page);

  // The map moved: the whole-campus view's empty spot is now off to the side, so the view is different.
  const box = await canvasBox(page);
  await page.mouse.click(box.x + box.width * 0.98, box.y + box.height * 0.5);
  await expect(page.getByRole("alert")).toContainText("off campus");

  // It stopped at the limit: dragged as far as allowed, the view's top-left corner still lands on
  // campus. With no limit, the view would be far from campus by now and this tap would be refused.
  await page.mouse.click(box.x + 12, box.y + 12);
  await expect(page.getByTestId("pin-summary")).toContainText(/Near .+ m away/);
});

test("show whole campus brings the view back after dragging away", async ({ page }) => {
  await dragTowardSoutheast(page);

  await page.getByRole("button", { name: "Show whole campus" }).click();
  await page.waitForTimeout(1_000);
  await tapEmptySpotOnCampus(page);

  await expect(page.getByTestId("pin-summary")).toContainText(/Near .+ m away/);
});

test("a failed API call shows the problem, and retrying recovers", async ({ page }) => {
  await page.route("**/api/buildings", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/problem+json",
      json: { title: "Service Unavailable", status: 503, detail: "The database is unreachable." },
    }),
  );
  await page.reload();

  await expect(page.getByRole("alert")).toHaveText("The database is unreachable.");
  // The map still works without the building list.
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();

  await page.unroute("**/api/buildings");
  await page.getByRole("button", { name: "Try again" }).click();

  await expect(page.getByRole("button", { name: "Library", exact: true })).toBeVisible();
});

test.describe("on a phone-sized screen", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the map and the building list on screen together", async ({ page }) => {
    const map = await canvasBox(page);
    const library = await page.getByRole("button", { name: "Library", exact: true });
    await library.scrollIntoViewIfNeeded();
    const row = await library.boundingBox();

    expect(map.height).toBeGreaterThan(250);
    expect(row).not.toBeNull();
    expect(row!.y).toBeGreaterThanOrEqual(map.y + map.height);
    expect(row!.y + row!.height).toBeLessThanOrEqual(844);
  });
});

test.describe("accessibility", () => {
  const seriousViolations = async (page: Page) => {
    const { violations } = await new AxeBuilder({ page }).analyze();
    return violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
  };

  test("has no serious violations on load", async ({ page }) => {
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("has no serious violations with a pin dropped", async ({ page }) => {
    await page.getByRole("button", { name: "Library", exact: true }).click();
    await expect(page.getByTestId("pin-summary")).toContainText("At Library");

    expect(await seriousViolations(page)).toEqual([]);
  });
});
