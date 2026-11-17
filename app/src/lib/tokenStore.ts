import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/** Where the API's access token is kept. Playwright writes to this key to start signed in. */
export const TOKEN_KEY = "app_jwt";

type TokenStore = {
  get: () => Promise<string | null>;
  set: (token: string) => Promise<void>;
  clear: () => Promise<void>;
};

const web: TokenStore = {
  get: async () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: async (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: async () => localStorage.removeItem(TOKEN_KEY),
};

const native: TokenStore = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

/** Keeps the access token: SecureStore on Android, localStorage on web. See docs/appendix_i_auth.md, section 4.5. */
export const tokenStore: TokenStore = Platform.OS === "web" ? web : native;
