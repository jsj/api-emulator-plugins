import type { RouteContext, Store } from "@api-emulator/core";

/**
 * iTunes Search / Lookup API emulator.
 *
 * Serves both the raw Apple endpoints (`/search`, `/lookup`) and the
 * xc-cli proxied paths (`/v1/app-store/search`, `/v1/app-store/lookup`,
 * `/v1/app-store/storefront`) so the emulator works whether the client
 * hits iTunes directly or goes through `AppStoreBackendRequestMapper`.
 */

interface ITunesApp {
  trackId: number;
  trackName: string;
  bundleId: string;
  sellerName: string;
  primaryGenreName: string;
  averageUserRating: number;
  userRatingCount: number;
  description: string;
  screenshotUrls: string[];
  ipadScreenshotUrls: string[];
  appletvScreenshotUrls: string[];
  supportedDevices: string[];
}

function getApps(store: Store): ITunesApp[] {
  return store.getData<ITunesApp[]>("itunes.apps") ?? [];
}

function searchApps(apps: ITunesApp[], term: string, limit: number): ITunesApp[] {
  const lower = term.toLowerCase();
  const matched = apps.filter(
    (a) =>
      a.trackName.toLowerCase().includes(lower) ||
      a.bundleId.toLowerCase().includes(lower) ||
      a.description.toLowerCase().includes(lower),
  );
  return matched.slice(0, limit);
}

function itunesResponse(results: ITunesApp[]) {
  return { resultCount: results.length, results };
}

export function itunesRoutes({ app, store }: RouteContext): void {
  // --- Raw iTunes endpoints ---

  app.get("/search", (c) => {
    const term = c.req.query("term") ?? "";
    const limit = parseInt(c.req.query("limit") ?? "10", 10);
    const results = searchApps(getApps(store), term, limit);
    return c.json(itunesResponse(results));
  });

  app.get("/lookup", (c) => {
    const id = c.req.query("id") ?? "";
    const apps = getApps(store);
    const found = apps.filter((a) => String(a.trackId) === id);
    return c.json(itunesResponse(found));
  });

  // --- xc-cli proxied endpoints ---

  app.get("/v1/app-store/search", (c) => {
    const term = c.req.query("term") ?? "";
    const limit = parseInt(c.req.query("limit") ?? "10", 10);
    const results = searchApps(getApps(store), term, limit);
    return c.json(itunesResponse(results));
  });

  app.get("/v1/app-store/lookup", (c) => {
    const appId = c.req.query("appId") ?? "";
    const apps = getApps(store);
    const found = apps.filter((a) => String(a.trackId) === appId);
    return c.json(itunesResponse(found));
  });

  // Storefront (screenshot HTML scraping fallback) — return minimal HTML
  app.get("/v1/app-store/storefront", (c) => {
    const appId = c.req.query("appId") ?? "";
    const apps = getApps(store);
    const found = apps.find((a) => String(a.trackId) === appId);
    if (!found || found.screenshotUrls.length === 0) {
      return c.html("<html><body></body></html>");
    }
    // Return minimal HTML that AppStoreStorefrontScreenshotParser can extract
    const pictures = found.screenshotUrls
      .map((url) => `<picture><source srcset="${url} 460w"></picture>`)
      .join("\n");
    return c.html(`<html><body><section id="product_media_screenshots">${pictures}</section><div class="platform-description"></div></body></html>`);
  });

  // Storefront direct path (apps.apple.com/:store/app/id:appId)
  app.get("/:store/app/id:appId", (c) => {
    const appId = c.req.param("appId");
    const apps = getApps(store);
    const found = apps.find((a) => String(a.trackId) === appId);
    if (!found) {
      return c.html("<html><body></body></html>");
    }
    const pictures = found.screenshotUrls
      .map((url) => `<picture><source srcset="${url} 460w"></picture>`)
      .join("\n");
    return c.html(`<html><body><section id="product_media_screenshots">${pictures}</section><div class="platform-description"></div></body></html>`);
  });
}

// --- Seed support ---

export interface ITunesSeedConfig {
  apps?: Array<{
    trackId: number;
    trackName: string;
    bundleId: string;
    sellerName?: string;
    primaryGenreName?: string;
    averageUserRating?: number;
    userRatingCount?: number;
    description?: string;
    screenshotUrls?: string[];
  }>;
}

export function seedITunes(store: Store, config: ITunesSeedConfig): void {
  if (config.apps) {
    const apps: ITunesApp[] = config.apps.map((a) => ({
      trackId: a.trackId,
      trackName: a.trackName,
      bundleId: a.bundleId,
      sellerName: a.sellerName ?? "",
      primaryGenreName: a.primaryGenreName ?? "Utilities",
      averageUserRating: a.averageUserRating ?? 4.5,
      userRatingCount: a.userRatingCount ?? 100,
      description: a.description ?? "",
      screenshotUrls: a.screenshotUrls ?? [],
      ipadScreenshotUrls: [],
      appletvScreenshotUrls: [],
      supportedDevices: ["iPhone", "iPad"],
    }));
    store.setData("itunes.apps", apps);
  }
}
