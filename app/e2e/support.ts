import type { APIRequestContext, Page } from "@playwright/test";

/** A stand-in base map, so a slow or down tile provider can't fail a test. */
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

export const stubBaseMap = (page: Page) => page.route("https://tiles.openfreemap.org/**", (route) => route.fulfill({ json: STUB_STYLE }));

/** Starts the page signed in, by saving a real token for a seeded test account. Needs compose.e2e.yml. */
export async function signInAs(page: Page, request: APIRequestContext, email = "e2e-user@example.test") {
  const response = await request.post(`http://localhost:8080/test/token?email=${email}`);
  if (!response.ok()) throw new Error(`No test token (${response.status()}). Start the API with compose.e2e.yml.`);
  const { token } = (await response.json()) as { token: string };
  await page.addInitScript((value) => localStorage.setItem("app_jwt", value), token);
}
