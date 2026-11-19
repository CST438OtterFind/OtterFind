import { useRef, useState } from "react";
import { Platform } from "react-native";
import { CodeChallengeMethod, makeRedirectUri, ResponseType, useAuthRequest } from "expo-auth-session";
import * as Crypto from "expo-crypto";
import { ApiError, exchangeGitHubCode } from "@/lib/api";
import { useSession } from "@/lib/session";

const GITHUB_DISCOVERY = {
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  tokenEndpoint: "https://github.com/login/oauth/access_token",
};

/** GitHub web sign-in from Appendix I §4.2. Expo validates state; the API exchanges the code using PKCE. */
export function useGitHubLogin() {
  const { signIn } = useSession();
  const [state, setState] = useState(() => Crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const clientId = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID?.trim();
  const redirectUri = makeRedirectUri({ scheme: "otterfind", path: "auth" });
  const [request, , promptAsync] = useAuthRequest(
    {
      // Keep the hook mounted when config is absent; the button stays disabled and this ID is never sent.
      clientId: clientId || "unconfigured",
      scopes: ["read:user", "user:email"],
      responseType: ResponseType.Code,
      usePKCE: true,
      codeChallengeMethod: CodeChallengeMethod.S256,
      state,
      redirectUri,
    },
    GITHUB_DISCOVERY,
  );

  const ready = Platform.OS === "web" && !!clientId && !!request?.codeVerifier && request.state === state;

  const signInWithGitHub = async () => {
    if (!ready || !request || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      // No asynchronous work before promptAsync: browsers require the popup to follow the user's click.
      const response = await promptAsync();
      if (response.type === "cancel" || response.type === "dismiss") {
        setError("GitHub sign-in was cancelled. You can try again.");
      } else if (response.type === "success" && response.params.code && response.params.state === request.state) {
        const session = await exchangeGitHubCode({
          code: response.params.code,
          codeVerifier: request.codeVerifier!,
          redirectUri,
        });
        await signIn(session.token);
      } else {
        setError("GitHub sign-in could not be verified. Please try again.");
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't finish GitHub sign-in. Allow popups and try again.");
    } finally {
      // A new state makes AuthSession prepare a fresh request and PKCE pair before another attempt.
      setState(Crypto.randomUUID());
      inFlight.current = false;
      setBusy(false);
    }
  };

  const unavailable = Platform.OS === "web" && !clientId ? "GitHub sign-in is currently unavailable." : null;
  return { ready, busy, error: error ?? unavailable, signInWithGitHub };
}
