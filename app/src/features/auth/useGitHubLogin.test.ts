import { act, renderHook } from "@testing-library/react-native";
import { Platform } from "react-native";
import { makeRedirectUri, useAuthRequest } from "expo-auth-session";
import * as Crypto from "expo-crypto";
import { ApiError, exchangeGitHubCode } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useGitHubLogin } from "./useGitHubLogin";

jest.mock("expo-auth-session", () => ({
  useAuthRequest: jest.fn(),
  makeRedirectUri: jest.fn(() => "http://localhost:8081/auth"),
  CodeChallengeMethod: { S256: "S256" },
  ResponseType: { Code: "code" },
}));
jest.mock("expo-crypto", () => ({ randomUUID: jest.fn() }));
jest.mock("@/lib/session", () => ({ useSession: jest.fn() }));
jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  exchangeGitHubCode: jest.fn(),
}));

const STATE = "00000000-0000-4000-8000-000000000001";
const NEXT_STATE = "00000000-0000-4000-8000-000000000002";
const VERIFIER = "a".repeat(43);
const prompt = jest.fn();
const signIn = jest.fn();
const exchange = jest.mocked(exchangeGitHubCode);
const originalClientId = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID;

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, "OS", "web");
  process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID = "test-client";
  jest.mocked(Crypto.randomUUID).mockReset().mockReturnValue(NEXT_STATE).mockReturnValueOnce(STATE);
  jest.mocked(useSession).mockReturnValue({ status: "signedOut", signIn, signOut: jest.fn() });
  jest.mocked(useAuthRequest).mockImplementation((config) => [
    { state: config.state, codeVerifier: VERIFIER } as NonNullable<ReturnType<typeof useAuthRequest>[0]>,
    null,
    prompt,
  ]);
  prompt.mockReset().mockResolvedValue({ type: "success", params: { code: "test-code", state: STATE } });
  exchange.mockReset().mockResolvedValue({ token: "app-token", user: { id: 1, email: "otter@example.test", displayName: "Otter", role: "USER" } });
  signIn.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  if (originalClientId === undefined) delete process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID;
  else process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID = originalClientId;
});

it("requests a code with S256 PKCE and exchanges the original verifier and callback before saving the app token", async () => {
  const { result } = await renderHook(() => useGitHubLogin());
  expect(useAuthRequest).toHaveBeenCalledWith(expect.objectContaining({
    clientId: "test-client", scopes: ["read:user", "user:email"], usePKCE: true,
    codeChallengeMethod: "S256", responseType: "code", state: STATE,
  }), expect.objectContaining({ authorizationEndpoint: "https://github.com/login/oauth/authorize" }));
  expect(makeRedirectUri).toHaveBeenCalledWith({ scheme: "otterfind", path: "auth" });
  await act(() => result.current.signInWithGitHub());
  expect(exchange).toHaveBeenCalledWith({ code: "test-code", codeVerifier: VERIFIER, redirectUri: "http://localhost:8081/auth" });
  expect(signIn).toHaveBeenCalledWith("app-token");
  expect(result.current.error).toBeNull();
  expect(useAuthRequest).toHaveBeenLastCalledWith(expect.objectContaining({ state: NEXT_STATE }), expect.anything());
});

it.each(["cancel", "dismiss"])("handles %s without exchanging a code", async (type) => {
  prompt.mockResolvedValue({ type });
  const { result } = await renderHook(() => useGitHubLogin());
  await act(() => result.current.signInWithGitHub());
  expect(result.current.error).toContain("cancelled");
  expect(exchange).not.toHaveBeenCalled();
  expect(signIn).not.toHaveBeenCalled();
  expect(result.current.busy).toBe(false);
});

it.each([
  { type: "error", error: { code: "state_mismatch" } },
  { type: "success", params: { code: "code", state: "wrong-state" } },
  { type: "success", params: { state: STATE } },
])("rejects failed state validation or incomplete provider responses", async (response) => {
  prompt.mockResolvedValue(response);
  const { result } = await renderHook(() => useGitHubLogin());
  await act(() => result.current.signInWithGitHub());
  expect(exchange).not.toHaveBeenCalled();
  expect(signIn).not.toHaveBeenCalled();
  expect(result.current.error).toContain("could not be verified");
});

it("shows the API email-conflict message without establishing a session", async () => {
  exchange.mockRejectedValue(new ApiError("Sign in with your original Google account.", 409));
  const { result } = await renderHook(() => useGitHubLogin());
  await act(() => result.current.signInWithGitHub());
  expect(result.current.error).toBe("Sign in with your original Google account.");
  expect(signIn).not.toHaveBeenCalled();
});

it("explains a blocked popup without exposing raw provider errors", async () => {
  prompt.mockRejectedValue(new Error("raw-provider-error"));
  const { result } = await renderHook(() => useGitHubLogin());
  await act(() => result.current.signInWithGitHub());
  expect(result.current.error).toContain("Allow popups");
  expect(exchange).not.toHaveBeenCalled();
});

it("does not prompt without a configured public client ID", async () => {
  delete process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID;
  const { result } = await renderHook(() => useGitHubLogin());
  expect(result.current.ready).toBe(false);
  await act(() => result.current.signInWithGitHub());
  expect(prompt).not.toHaveBeenCalled();
  expect(result.current.error).toContain("unavailable");
});

it("waits for PKCE request preparation", async () => {
  jest.mocked(useAuthRequest).mockReturnValue([null, null, prompt]);
  const { result } = await renderHook(() => useGitHubLogin());
  expect(result.current.ready).toBe(false);
  await act(() => result.current.signInWithGitHub());
  expect(prompt).not.toHaveBeenCalled();
});

it("prevents a second click from opening another popup while sign-in is pending", async () => {
  let finish!: (value: unknown) => void;
  prompt.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const { result } = await renderHook(() => useGitHubLogin());
  let pending!: Promise<void>;
  await act(async () => { pending = result.current.signInWithGitHub(); });
  expect(result.current.busy).toBe(true);
  await act(() => result.current.signInWithGitHub());
  expect(prompt).toHaveBeenCalledTimes(1);
  await act(async () => { finish({ type: "cancel" }); await pending; });
});
