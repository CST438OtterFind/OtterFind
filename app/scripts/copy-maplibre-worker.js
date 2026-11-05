// maplibre-gl loads its worker from a separate file at runtime, and Expo's web bundler doesn't ship that
// file. Without it the web map never finishes loading, even though the build succeeds. Copying it on
// every install keeps it the same version as the library. CampusMap.web.tsx points at the copy.
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = path.join(root, "node_modules", "maplibre-gl", "dist", "maplibre-gl-worker.mjs");
const targetDir = path.join(root, "public");

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, path.join(targetDir, "maplibre-gl-worker.mjs"));
