import { defineConfig } from "@playwright/test";

/** Runs against the exported web build. Start the API first, from the repo root: `docker compose -f compose.yaml -f compose.e2e.yml up --build`. */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    // Must be an origin the API allows. See APP_CORS_ORIGINS in .env.example at the repo root.
    baseURL: "http://localhost:8081",
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
    // The map draws with WebGL, which needs a software renderer on machines with no GPU, such as CI.
    launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
  webServer: {
    // The app is built from the repo root. This server also lets a test open /map or /items/42 directly.
    command: "npm run build:web && node app/scripts/serve-web-build.js",
    cwd: "..",
    // The auth browser test intercepts GitHub, so CI needs only a dummy public ID, never provider secrets.
    env: { EXPO_PUBLIC_GITHUB_CLIENT_ID: process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || "playwright-github-client" },
    url: "http://localhost:8081",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
