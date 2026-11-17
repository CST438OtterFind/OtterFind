# OtterFind app code

The map, the listings, the messages and the routes for the OtterFind app. This folder is an npm workspace of the Expo app
at the repo root, so install and run everything from the root. See the root `README.md`.

## What you can try

Signed out:

- See the campus map with a marker for each building. The buildings come from the API.
- Drag and zoom. The map stops at the campus limit, and everything off campus is shaded.
- Choose a building, search for one, or tap the map to drop a pin. Tapping off campus is refused.
- Open **Messages** to see the inbox, open a conversation, and send a message. It runs on sample
  conversations until the messaging API and sign-in exist, and resets when the app reloads.

With the test account, as described in the root `README.md`:

- See every listing, newest first, with its age.
- See every saved pin on the whole-campus map, colored by age.
- Open a listing to see its details and a map centered on its pin.
- Name a dropped pin and save it. It's still there after a reload.
- Delete your own listing.

## Pages

| URL | Page | API call |
|---|---|---|
| `/` | Listings when signed in, otherwise the sign-in page in the root `App.tsx` | `GET /api/items` |
| `/map` | The whole-campus map. `?item=42` centers it on that listing | `GET /api/buildings`, `GET /api/items` |
| `/items/42` | One listing | `GET /api/items/42` |
| `/messages` | Your conversations, most recent first | None yet. Will be `GET /api/conversations` |
| `/messages/<id>` | One conversation, with a box to send a message | None yet. Will be `GET` and `POST /api/conversations/{id}/messages` |

## Test it

From the repo root:

```bash
npm run typecheck
npm test                 # logic tests
npm run test:coverage    # the same, and fails under the coverage threshold

npx playwright install chromium    # first time only
npm run e2e                        # needs the compose.e2e.yml stack running
```

The Playwright tests cover the web client. They don't run on Android, so check Android by hand.

## How the code is organized

| Path | What it holds |
|---|---|
| `src/app/` | Screens. Expo Router turns each file into a route |
| `src/lib/api.ts` | The one module that calls the API. Add new endpoints here |
| `src/lib/session.tsx`, `src/lib/tokenStore.ts` | Who's signed in, and where the access token is kept |
| `src/features/listings/` | The listing screens, the save form, and how ages are worded |
| `src/features/map/campus.ts` | The campus limits and the pin rules |
| `src/features/map/mapData.ts` | Colors, and converting data to GeoJSON for the map |
| `src/features/map/CampusMap.web.tsx` | The map on web (`maplibre-gl`) |
| `src/features/map/CampusMap.native.tsx` | The map on Android (`@maplibre/maplibre-react-native`) |
| `src/features/map/MapScreen.tsx`, `MapPanel.tsx` | The screen around the map, shared by both platforms |
| `src/features/messages/format.ts` | The message rules (1 to 1000 characters) and the times and labels the screens show |
| `src/features/messages/sampleMessages.ts` | A stand-in for the messaging API, with the same rules, until the real one exists |
| `src/features/messages/useConversations.ts`, `useConversation.ts` | Loading the inbox and one conversation, and sending |
| `src/features/messages/InboxScreen.tsx`, `ConversationScreen.tsx` | The messaging screens, shared by both platforms |
| `e2e/` | The Playwright test |

## Things to know

- **The two maps differ on purpose.** On web, `maxBounds` limits everything visible, so the web limit
  has padding that lets a phone-sized browser fit the whole campus. On Android it limits only the map's
  center, so Android uses the exact campus limit. The real rule is `isOnCampus` in `campus.ts`.
- **Web needs a worker file.** `npm install` copies it into `public/` at the repo root. Without it the page looks fine,
  but the map never finishes loading.
- **The API has the final say.** The campus check here only gives quick feedback. `CampusBounds.kt` in the
  API makes the real decision, so change both together.
- **Connecting real sign-in:** call `signIn(token)` from `useSession()` with the API's token, where the token's
  subject is the user's ID. Then remove the "Use test account" button from `src/app/index.tsx`.
- **Messaging runs on sample data for now.** `sampleMessages.ts` stands in for the messaging routes in
  `docs/openapi.yaml`, with the same rules, including 404 for a conversation that isn't yours. Its
  functions have the same signatures the real ones in `src/lib/api.ts` will have, so connecting the
  screens means adding those to `api.ts` and passing them to `useConversations` and `useConversation`.
- **Credit:** the map data is © OpenStreetMap contributors, and that credit must stay visible.
