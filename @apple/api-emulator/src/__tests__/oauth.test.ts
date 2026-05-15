import { describe, expect, it } from "vitest";
import { Store } from "@api-emulator/core";
import { Hono } from "hono";
import type { AppEnv } from "@api-emulator/core";
import { plugin } from "../index.js";

function createOAuthApp() {
  const app = new Hono<AppEnv>();
  const store = new Store();
  const webhooks = { dispatch: () => {}, subscribe: () => () => {} } as never;
  plugin.register(app, store, webhooks, "http://localhost:4000");
  return app;
}

describe("Sign in with Apple OAuth", () => {
  it("issues authorization codes and exchanges them for tokens", async () => {
    const app = createOAuthApp();
    const authRes = await app.request("/auth/authorize?client_id=com.example.app&state=s1");
    expect(authRes.status).toBe(200);
    const auth = await authRes.json();
    expect(auth.code).toMatch(/^apple-code-/);

    const tokenRes = await app.request("/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: "com.example.app",
        code: auth.code,
      }),
    });
    expect(tokenRes.status).toBe(200);
    const token = await tokenRes.json();
    expect(token.access_token).toMatch(/^apple-access-/);
    expect(token.id_token.split(".")).toHaveLength(3);
  });

  it("exposes Apple identity keys and revoke endpoint", async () => {
    const app = createOAuthApp();

    const keysRes = await app.request("/auth/keys");
    expect(keysRes.status).toBe(200);
    const keys = await keysRes.json();
    expect(keys.keys[0].kid).toBe("apple-emulator-key");

    const revokeRes = await app.request("/auth/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: "token-1" }),
    });
    expect(revokeRes.status).toBe(200);
  });
});
