import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

/** Exercises the real popup and callback while stubbing the external provider and API responses. */
test("GitHub popup returns to auth, exchanges the matching PKCE verifier and signs into the feed", async ({ page, context }) => {
  let challenge = "";
  let exchangeCount = 0;
  const appToken = "test-app-token";
  await context.route("https://github.com/login/oauth/authorize**", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")).toContain("user:email");
    challenge = url.searchParams.get("code_challenge")!;
    const callback = new URL(url.searchParams.get("redirect_uri")!);
    expect(callback.href).toBe("http://localhost:8081/auth");
    callback.searchParams.set("code", "browser-test-code");
    callback.searchParams.set("state", url.searchParams.get("state")!);
    await route.fulfill({ contentType: "text/html", body: `<script>location.replace(${JSON.stringify(callback.href)})</script>` });
  });
  await context.route("**/auth/github", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: {
        "Access-Control-Allow-Origin": "http://localhost:8081",
        "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "content-type",
      } });
      return;
    }
    const body = route.request().postDataJSON();
    expect(body.code).toBe("browser-test-code");
    expect(body.redirectUri).toBe("http://localhost:8081/auth");
    expect(createHash("sha256").update(body.codeVerifier).digest("base64url")).toBe(challenge);
    expect(route.request().headers().authorization).toBeUndefined();
    exchangeCount += 1;
    await route.fulfill({
      headers: { "Access-Control-Allow-Origin": "http://localhost:8081" },
      json: { token: appToken, user: { id: 1, email: "otter@example.test", displayName: "Otter", role: "USER" } },
    });
  });
  await context.route("**/api/items", async (route) => {
    await route.fulfill({ headers: {
      "Access-Control-Allow-Origin": "http://localhost:8081",
      "Access-Control-Allow-Headers": "authorization",
    }, json: [] });
  });
  await page.goto("/");
  const signIn = page.getByRole("button", { name: "Continue with GitHub" });
  await expect(signIn).toBeEnabled();
  const popupPromise = page.waitForEvent("popup");
  await signIn.click();
  const popup = await popupPromise;
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect.poll(() => popup.isClosed()).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("app_jwt"))).toBe(appToken);
  expect(exchangeCount).toBe(1);
  await page.reload();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("app_jwt"))).toBeNull();
});

test("opening the callback directly offers a return path without creating a session", async ({ page }) => {
  await page.goto("/auth?code=untrusted-code&state=untrusted-state");
  await expect(page.getByRole("link", { name: "Return to OtterFind" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("app_jwt"))).toBeNull();
});
