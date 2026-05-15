import { describe, it, expect } from "vitest";
import { Store } from "@api-emulator/core";
import { Hono } from "hono";
import type { AppEnv } from "@api-emulator/core";
import { ascPlugin } from "../index.js";

function createTestApp() {
  const app = new Hono<AppEnv>();
  const store = new Store();
  const webhooks = { dispatch: () => {}, subscribe: () => () => {} } as never;
  ascPlugin.register(app, store, webhooks, "http://localhost:4000");
  return app;
}

describe("local APNS emulator", () => {
  it("stores sent notifications and returns history", async () => {
    const app = createTestApp();
    const send = await app.request("/3/device/device-token-1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apns-topic": "com.example.app",
        "apns-push-type": "alert",
        "apns-priority": "10",
      },
      body: JSON.stringify({ aps: { alert: "Hello" } }),
    });

    expect(send.status).toBe(200);
    expect(send.headers.get("apns-id")).toBeTruthy();

    const history = await app.request("/inspect/apns/notifications?token=device-token-1&limit=1");
    expect(history.status).toBe(200);
    const json = await history.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].token).toBe("device-token-1");
    expect(json.data[0].topic).toBe("com.example.app");
    expect(json.data[0].push_type).toBe("alert");
    expect(json.data[0].payload.aps.alert).toBe("Hello");
  });

  it("rejects malformed payloads", async () => {
    const app = createTestApp();
    const res = await app.request("/3/device/device-token-1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ reason: "BadPayload" });
  });
});
