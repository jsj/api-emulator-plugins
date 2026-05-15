import { describe, it, expect } from "vitest";
import { Store } from "@api-emulator/core";
import { Hono } from "hono";
import type { AppEnv } from "@api-emulator/core";
import { plugin } from "../index.js";
import { seedITunes } from "../routes/itunes.js";

function createTestApp() {
  const app = new Hono<AppEnv>();
  const store = new Store();
  const baseUrl = "http://localhost:4000";

  seedITunes(store, {
    apps: [
      {
        trackId: 123456789,
        trackName: "HN Sample",
        bundleId: "com.example.hnsample",
        sellerName: "Example Inc",
        primaryGenreName: "News",
        averageUserRating: 4.8,
        userRatingCount: 500,
        description: "A Hacker News reader for iOS",
        screenshotUrls: ["https://example.com/ss1.jpg", "https://example.com/ss2.jpg"],
      },
      {
        trackId: 987654321,
        trackName: "Weather Pro",
        bundleId: "com.example.weather",
        description: "Accurate weather forecasts",
      },
    ],
  });

  const webhooks = { dispatch: () => {}, subscribe: () => () => {} } as never;
  plugin.register(app, store, webhooks, baseUrl);

  return { app, store };
}

describe("iTunes search API", () => {
  it("searches by term via raw /search", async () => {
    const { app } = createTestApp();
    const res = await app.request("/search?term=hacker&limit=10");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.resultCount).toBe(1);
    expect(json.results[0].trackName).toBe("HN Sample");
    expect(json.results[0].trackId).toBe(123456789);
  });

  it("searches via proxied /v1/app-store/search", async () => {
    const { app } = createTestApp();
    const res = await app.request("/v1/app-store/search?term=weather&store=us&limit=5");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.resultCount).toBe(1);
    expect(json.results[0].trackName).toBe("Weather Pro");
  });

  it("returns empty for no match", async () => {
    const { app } = createTestApp();
    const res = await app.request("/search?term=nonexistent&limit=10");
    const json = await res.json();
    expect(json.resultCount).toBe(0);
    expect(json.results).toEqual([]);
  });

  it("respects limit", async () => {
    const { app } = createTestApp();
    const res = await app.request("/search?term=e&limit=1");
    const json = await res.json();
    expect(json.resultCount).toBe(1);
  });
});

describe("iTunes lookup API", () => {
  it("looks up by ID via raw /lookup", async () => {
    const { app } = createTestApp();
    const res = await app.request("/lookup?id=123456789");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.resultCount).toBe(1);
    expect(json.results[0].bundleId).toBe("com.example.hnsample");
    expect(json.results[0].averageUserRating).toBe(4.8);
  });

  it("looks up via proxied /v1/app-store/lookup", async () => {
    const { app } = createTestApp();
    const res = await app.request("/v1/app-store/lookup?appId=987654321&store=us");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.resultCount).toBe(1);
    expect(json.results[0].trackName).toBe("Weather Pro");
  });

  it("returns empty for unknown ID", async () => {
    const { app } = createTestApp();
    const res = await app.request("/lookup?id=999");
    const json = await res.json();
    expect(json.resultCount).toBe(0);
  });
});

describe("storefront screenshot fallback", () => {
  it("returns HTML with screenshot srcset via proxied path", async () => {
    const { app } = createTestApp();
    const res = await app.request("/v1/app-store/storefront?appId=123456789&store=us");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("product_media_screenshots");
    expect(html).toContain("https://example.com/ss1.jpg");
    expect(html).toContain("https://example.com/ss2.jpg");
  });

  it("returns empty HTML for app with no screenshots", async () => {
    const { app } = createTestApp();
    const res = await app.request("/v1/app-store/storefront?appId=987654321&store=us");
    const html = await res.text();
    expect(html).not.toContain("product_media_screenshots");
  });
});
