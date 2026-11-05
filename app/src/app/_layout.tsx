import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

/** The root of every screen in the app. */
export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
