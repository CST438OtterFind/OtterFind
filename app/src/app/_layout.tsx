import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "@/lib/session";
import * as WebBrowser from "expo-web-browser";

// Must run on the popup's /auth page too, before any sign-in hook needs to mount (Appendix I §4.2).
WebBrowser.maybeCompleteAuthSession();

/** The root of every screen in the app. */
export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}
