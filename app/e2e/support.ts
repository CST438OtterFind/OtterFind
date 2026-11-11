import type { Page } from "@playwright/test";

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
