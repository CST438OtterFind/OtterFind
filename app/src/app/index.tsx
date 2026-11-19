import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { HomeScreen } from "@/features/listings/HomeScreen";
import { ApiError, getTestAccountToken } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useGitHubLogin } from "@/features/auth/useGitHubLogin";
import App from "../../../App";

const TEST_ACCOUNT_EMAIL = "e2e-user@example.test";
const showTestAccount = process.env.EXPO_PUBLIC_TEST_ACCOUNT === "true";

/** Signed-in users get the listings. Everyone else gets the sign-in page in the root `App.tsx`. */
export default function Index() {
  const { status } = useSession();
  if (status === "loading") return null;
  return status === "signedIn" ? <HomeScreen /> : <SignedOutHome />;
}

function SignedOutHome() {
  const { signIn } = useSession();
  const github = useGitHubLogin();
  const [error, setError] = useState<string | null>(null);

  // Standing in for sign-in until #8 lands. Only appears with EXPO_PUBLIC_TEST_ACCOUNT=true.
  const signInWithTestAccount = async () => {
    setError(null);
    try {
      await signIn(await getTestAccountToken(TEST_ACCOUNT_EMAIL));
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status !== 401 ? caught.message : "The test account needs the API started with compose.e2e.yml.");
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.app}>
        <App
          onGitHubSignIn={() => void github.signInWithGitHub()}
          githubReady={github.ready}
          githubBusy={github.busy}
          githubError={github.error}
        />
      </View>
      <View style={styles.bar}>
        <Link href="/map" style={styles.link}>
          View campus map
        </Link>
        {showTestAccount ? (
          <Pressable accessibilityRole="button" onPress={() => void signInWithTestAccount()}>
            <Text style={styles.link}>Use test account</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  app: { flex: 1 },
  bar: { backgroundColor: "#112E51", flexDirection: "row", gap: 24, justifyContent: "center", padding: 14 },
  link: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  error: { backgroundColor: "#FBE9EC", color: "#8A0B20", fontSize: 14, padding: 10, textAlign: "center" },
});
