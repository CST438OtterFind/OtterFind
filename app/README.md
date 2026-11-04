# OtterFind app

The React Native (Expo) client for web and Android, built from one codebase. So far it has the
Sprint 1 campus map, with no sign-in and no saved reports yet.

## What you can try

- See the campus map with a marker for each building. The buildings come from the API.
- Drag and zoom. The map stops at the campus limit, and everything off campus is shaded.
- Choose a building from the list, search for one, or tap its marker, to drop a pin on it.
- Tap anywhere on campus to drop a pin and see the nearest building. Pins aren't saved yet.
- Tap off campus to see the pin refused.

## Run it

Start the API first, from the repo root:

```bash
cp .env.example .env     # first time only, then set APP_JWT_SECRET_BASE64 as the file says
docker compose up --build
```

Then, from `app/`:

```bash
npm install
```

**Web:**

```bash
npm run web              # http://localhost:8081
```

**Android emulator:** start an emulator from Android Studio first.

```bash
npm run android
```

The first build takes 5 to 15 minutes and downloads the Android NDK. After that, JavaScript changes
hot-reload. Rebuild only after changing `app.json` or adding a native library. Expo Go doesn't work
for this app, because MapLibre needs a development build.

If the build can't find your Android SDK, set `ANDROID_HOME` to its location.

To point the app at another API, such as the one on Render, see `.env.example`.

## Test it

```bash
npm run typecheck
npm test                 # logic tests
npm run test:coverage    # the same, and fails under the coverage threshold

npx playwright install chromium    # first time only
npm run e2e                        # needs docker compose up running
```

The Playwright test covers the web client. It doesn't run on Android, so check Android by hand.

## How the code is organized

| Path | What it holds |
|---|---|
| `src/app/` | Screens. Expo Router turns each file into a route |
| `src/lib/api.ts` | The one module that calls the API. Add new endpoints here |
| `src/features/map/campus.ts` | The campus limits and the pin rules |
| `src/features/map/mapData.ts` | Colors, and converting data to GeoJSON for the map |
| `src/features/map/CampusMap.web.tsx` | The map on web (`maplibre-gl`) |
| `src/features/map/CampusMap.native.tsx` | The map on Android (`@maplibre/maplibre-react-native`) |
| `src/features/map/MapScreen.tsx`, `MapPanel.tsx` | The screen around the map, shared by both platforms |
| `e2e/` | The Playwright test |

## Things to know

- **The two maps differ on purpose.** On web, `maxBounds` limits everything visible, so the web limit
  has padding that lets a phone-sized browser fit the whole campus. On Android it limits only the map's
  center, so Android uses the exact campus limit. The real rule is `isOnCampus` in `campus.ts`.
- **Web needs a worker file.** `npm install` copies it into `public/`. Without it the page looks fine,
  but the map never finishes loading.
- **The API has the final say.** The campus check here only gives quick feedback. When posting is built,
  the API must check the pin too, using the same limits.
- **Credit:** the map data is © OpenStreetMap contributors, and that credit must stay visible.
