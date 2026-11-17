import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setSessionExpiredHandler } from "./api";
import { tokenStore } from "./tokenStore";

type SessionStatus = "loading" | "signedOut" | "signedIn";

type Session = {
  status: SessionStatus;
  /** Call this with the API's access token once sign-in succeeds. */
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

/** Tracks whether someone is signed in. Real sign-in (#8) only needs to call `signIn` with the API's token. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");

  useEffect(() => {
    tokenStore.get().then((token) => setStatus(token ? "signedIn" : "signedOut"));
  }, []);

  const signIn = useCallback(async (token: string) => {
    await tokenStore.set(token);
    setStatus("signedIn");
  }, []);

  const signOut = useCallback(async () => {
    await tokenStore.clear();
    setStatus("signedOut");
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => void signOut());
    return () => setSessionExpiredHandler(() => {});
  }, [signOut]);

  const session = useMemo(() => ({ status, signIn, signOut }), [status, signIn, signOut]);
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

/** The current sign-in state. Must be used inside {@link SessionProvider}. */
export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside SessionProvider");
  return session;
}
