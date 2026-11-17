# OtterFind

The Expo app lives at the repository root. The Spring Boot API remains in `api/`. The map, the listings and
the app's routes are in `app/`, which shares one install with the root through npm workspaces.

## Before you start

Install these first:

| What | Version | Needed for | Check with |
|---|---|---|---|
| Node.js | 22, the version CI uses | Everything | `node --version` |
| Docker Desktop, running | Docker Compose 2.24 or newer | The API, its database and the API tests | `docker compose version` |
| JDK | 25 exactly | The API tests (`./gradlew check`) | See below |
| Android Studio and JDK 17 | | Only the Android app. See [Android](#android) | |

**JDK 25:** install [Temurin 25](https://adoptium.net/temurin/releases/?version=25). The API is built for Java 25
and won't use another version. Gradle finds an installed JDK 25 by itself, even when `JAVA_HOME` points at
the JDK 17 that the Android build uses, so you can keep both. On macOS, `/usr/libexec/java_home -V` lists every
JDK you have.

**On Windows,** use `copy` where these steps say `cp`, `.\gradlew.bat` where they say `./gradlew`, and run
`openssl` in Git Bash.

## Quick start: the API and the web app

1. Clone the repo:

   ```sh
   git clone https://github.com/CST438OtterFind/OtterFind.git
   cd OtterFind
   ```

2. Make your `.env`, then generate a secret and paste it into `.env` as the value of
   `APP_JWT_SECRET_BASE64`. The API won't start without it.

   ```sh
   cp .env.example .env
   openssl rand -base64 32
   ```

3. Start the API and its own Postgres. The first build takes a few minutes.

   ```sh
   docker compose up --build
   ```

4. In a second terminal, check that the API is up:

   ```sh
   curl http://localhost:8080/actuator/health   # shows "status":"UP"
   curl http://localhost:8080/api/buildings     # a list of campus buildings
   ```

5. Install the app's dependencies and start the web app, then open http://localhost:8081.
   **View campus map** shows the buildings from the API.

   ```sh
   npm install
   npm run web
   ```

To stop the API, press Ctrl+C in its terminal, or run `docker compose down`. Add `-v` to delete the local
database too.

## Try it with the test account

Listings need a signed-in user. Until sign-in is built, a local stack can use a seeded test account:

```sh
cp .env.example .env     # first time only, then set APP_JWT_SECRET_BASE64 as the file says
docker compose -f compose.yaml -f compose.e2e.yml up --build
```

In another terminal:

```sh
EXPO_PUBLIC_TEST_ACCOUNT=true npm run web
```

Choose **Use test account**. You'll see six seeded listings, and any pin you save goes to your local
Postgres. The test account only exists under `compose.e2e.yml`, so it can't be used on the deployed API. Plain
`docker compose up` runs the same stack with no test account or test data.

## Run the tests

From the repo root:

```sh
cd api && ./gradlew check && cd ..   # API tests, detekt and the coverage floor. Needs Docker and JDK 25
npm run typecheck
npm run test:coverage                # Client logic

npx playwright install chromium      # first time only
npm run e2e                          # Needs the compose.e2e.yml stack above running
```

## Run the app

### Web

```sh
npm start
```

Press `w` to open the app in your browser, or run `npm run web` instead. The map loads its buildings from the
API, so start the API first (quick start, step 3).

The Google and GitHub buttons are UI placeholders. OAuth isn't connected yet. **View campus map** opens the map,
and **Messages** opens messaging, which runs on sample conversations until the messaging API exists.

### Android

On Android the app runs as a **development build**: your own build of OtterFind with its native
setup included. Expo Go won't work, because sign-in needs the app's own `otterfind://` link scheme
and native Google Sign-In, which Expo Go can't provide (see `docs/appendix_i_auth.md`, section 5).

**One-time setup** (macOS shown; Windows steps are in Expo's
[environment guide](https://docs.expo.dev/get-started/set-up-your-environment/?platform=android&device=simulated&mode=development-build&buildEnv=local)):

1. Install JDK 17 with `brew install --cask zulu@17`, then add this line to your shell profile:
   `~/.zshrc` if your terminal uses zsh (the macOS default), or `~/.bash_profile` if it uses bash
   (run `echo $SHELL` to check). This is separate from the JDK 25 the API tests need, so keep both.

   ```sh
   export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
   ```

2. Install Android Studio. Under Settings → Languages & Frameworks → Android SDK, check
   **Android SDK Platform 36** on the SDK Platforms tab, and **Android SDK Build-Tools** and
   **Android Emulator** on the SDK Tools tab.
3. Add these lines to the same profile file, open a new terminal, and check that `adb --version`
   and `emulator -list-avds` both work:

   ```sh
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
   ```

4. In Android Studio, open More Actions → Virtual Device Manager, create a device from a recent
   Pixel, and start it.

**Build and run** with the emulator running:

```sh
npm run android
```

The first build takes 5 to 15 minutes. After that, `npm start` and pressing `a` opens the build
that's already installed, and JavaScript changes reload instantly.

If the build fails with `SDK location not found`, or says `spawn emulator ENOENT`, that terminal
can't see `ANDROID_HOME`. Redo step 3 and open a new terminal. Run `npm run android` again only
after changing `app.json` or adding a package with native code.

The build creates an `android/` folder. Git ignores it, so don't commit it; it's regenerated from
`app.json`.

**On a physical phone,** turn on USB debugging, plug the phone in, and run
`npx expo run:android --device`. On the emulator the app reaches the API on your computer by itself. On a
physical phone, set `EXPO_PUBLIC_API_URL` in `.env` to your computer's LAN address, as `.env.example` explains.