# OtterFind

The Expo app lives at the repository root. The Spring Boot API remains in `api/`. The map and the app's routes
are in `app/`, which shares one install with the root through npm workspaces.

## Run the app

Install dependencies once:

```sh
npm install
```

### Web

```sh
npm start
```

Press `w` to open the app in your browser, or run `npm run web` instead.

### Android

On Android the app runs as a **development build**: your own build of OtterFind with its native
setup included. Expo Go won't work, because sign-in needs the app's own `otterfind://` link scheme
and native Google Sign-In, which Expo Go can't provide (see `docs/appendix_i_auth.md`, section 5).

**One-time setup** (macOS shown; Windows steps are in Expo's
[environment guide](https://docs.expo.dev/get-started/set-up-your-environment/?platform=android&device=simulated&mode=development-build&buildEnv=local)):

1. Install JDK 17 with `brew install --cask zulu@17`, then add this line to your shell profile:
   `~/.zshrc` if your terminal uses zsh (the macOS default), or `~/.bash_profile` if it uses bash
   (run `echo $SHELL` to check):

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
`npx expo run:android --device`.

The Google and GitHub buttons are UI placeholders. OAuth isn't connected yet. **View campus map** opens the map,
which loads its buildings from the API, so start the API first:

```sh
cp .env.example .env     # first time only, then set APP_JWT_SECRET_BASE64 as the file says
docker compose up --build
```

## Run the tests

```sh
cd api && ./gradlew check && cd ..   # API tests, detekt and the coverage floor. Needs Docker.
npm run typecheck
npm run test:coverage                # Client logic

npx playwright install chromium      # first time only
npm run e2e                          # Needs the API above running
```
