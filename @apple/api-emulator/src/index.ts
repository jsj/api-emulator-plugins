import type { Hono } from "hono";
import type { ServicePlugin, Store, WebhookDispatcher, TokenMap, AppEnv, RouteContext } from "@emulators/core";
import { getASCStore } from "./store.js";
import { ascId } from "./jsonapi.js";
import { reviewSubmissionRoutes } from "./routes/review-submissions.js";
import { authRoutes } from "./routes/auth.js";
import { reviewRoutes } from "./routes/reviews.js";
import { xcodeCloudRoutes } from "./routes/xcode-cloud.js";
import { testflightRoutes } from "./routes/testflight.js";
import { uploadRoutes } from "./routes/upload.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { appRoutes } from "./routes/apps.js";
import { metadataRoutes } from "./routes/metadata.js";
import { reviewDetailRoutes } from "./routes/review-detail.js";
import { reviewItemRoutes } from "./routes/review-items.js";
import { stubRoutes } from "./routes/stubs.js";
import { adminRoutes } from "./routes/admin.js";
import { itunesRoutes, seedITunes } from "./routes/itunes.js";
import { apnsRoutes } from "./routes/apns.js";
import type { ReviewScenario } from "./entities.js";

export { getASCStore, type ASCStore } from "./store.js";
export * from "./entities.js";

export interface ASCSeedConfig {
  apps?: Array<{
    id?: string;
    name: string;
    bundle_id: string;
    primary_locale?: string;
  }>;
  builds?: Array<{
    id?: string;
    app_id: string;
    version: string;
    processing_state?: "PROCESSING" | "FAILED" | "INVALID" | "VALID";
    is_expired?: boolean;
  }>;
  versions?: Array<{
    id?: string;
    app_id: string;
    version_string: string;
    platform?: "IOS" | "MAC_OS" | "TV_OS" | "VISION_OS";
    app_store_state?: string;
  }>;
  review_scenario?: ReviewScenario;
  rejection_reasons?: string[];
  reviewer_notes?: string;
}

export const contract = {
  provider: "apple",
  source: "Apple APNs provider API documentation and App Store Connect API JSON:API conventions",
  docs: "https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns",
  scope: [
    "ams-auth",
    "apns-auth",
    "teams",
    "keys",
    "topics",
    "device-tokens",
    "notifications",
    "asc-apps",
    "asc-build-uploads",
    "asc-builds",
    "asc-testflight",
    "asc-review-submissions",
    "asc-xcode-cloud",
    "asc-metadata",
    "asc-readiness",
  ],
  fidelity: "resource-model-subset",
} as const;

function seedDefaults(store: Store, _baseUrl: string): void {
  const asc = getASCStore(store);

  asc.apps.insert({
    asc_id: "1234567890",
    name: "My App",
    bundle_id: "com.example.app",
    primary_locale: "en-US",
  });

  store.setData<ReviewScenario>("asc.review_scenario", "approve");
  store.setData<string[]>("asc.rejection_reasons", ["METADATA_REJECTED"]);
  store.setData<string | null>("asc.reviewer_notes", null);
}

export function seedFromConfig(store: Store, _baseUrl: string, config: ASCSeedConfig): void {
  const asc = getASCStore(store);

  if (config.apps) {
    for (const a of config.apps) {
      const existing = asc.apps.findOneBy("bundle_id", a.bundle_id);
      if (existing) continue;
      asc.apps.insert({
        asc_id: a.id ?? ascId(),
        name: a.name,
        bundle_id: a.bundle_id,
        primary_locale: a.primary_locale ?? "en-US",
      });
    }
  }

  if (config.builds) {
    for (const b of config.builds) {
      asc.builds.insert({
        asc_id: b.id ?? ascId(),
        app_id: b.app_id,
        version: b.version,
        processing_state: b.processing_state ?? "VALID",
        is_expired: b.is_expired ?? false,
      });
    }
  }

  if (config.versions) {
    for (const v of config.versions) {
      asc.versions.insert({
        asc_id: v.id ?? ascId(),
        app_id: v.app_id,
        version_string: v.version_string,
        platform: v.platform ?? "IOS",
        app_store_state: v.app_store_state ?? "PREPARE_FOR_SUBMISSION",
      });
    }
  }

  if (config.review_scenario) {
    store.setData<ReviewScenario>("asc.review_scenario", config.review_scenario);
  }
  if (config.rejection_reasons) {
    store.setData<string[]>("asc.rejection_reasons", config.rejection_reasons);
  }
  if (config.reviewer_notes !== undefined) {
    store.setData<string | null>("asc.reviewer_notes", config.reviewer_notes);
  }
}

export const plugin: ServicePlugin = {
  name: "apple",
  register(
    app: Hono<AppEnv>,
    store: Store,
    webhooks: WebhookDispatcher = { dispatch: () => {}, subscribe: () => () => {} } as unknown as WebhookDispatcher,
    baseUrl = "",
    tokenMap?: TokenMap,
  ): void {
    const ctx: RouteContext = { app, store, webhooks, baseUrl, tokenMap };
    reviewSubmissionRoutes(ctx);
    authRoutes(ctx);
    reviewRoutes(ctx);
    xcodeCloudRoutes(ctx);
    testflightRoutes(ctx);
    uploadRoutes(ctx);
    analyticsRoutes(ctx);
    appRoutes(ctx);
    metadataRoutes(ctx);
    reviewDetailRoutes(ctx);
    reviewItemRoutes(ctx);
    stubRoutes(ctx);
    adminRoutes(ctx);
    itunesRoutes(ctx);
    apnsRoutes(ctx);
  },
  seed(store: Store, baseUrl: string): void {
    seedDefaults(store, baseUrl);
  },
};

export const ascPlugin = plugin;

export default plugin;

export const label = "Apple AMS auth, APNS, and App Store Connect emulator";
export const endpoints = "apps, builds, versions, reviewSubmissions, customerReviews, users, ciProducts, ciWorkflows, ciBuildRuns, betaGroups, betaTesters, uploads, analytics, localizations, reviewDetails, certificates, profiles, screenshots, devices, subscriptions, gameCenter, local APNS, and 30+ more";
export const capabilities = contract.scope;
export const initConfig = {
  apple: {
    emulatorBaseUrl: "same emulator origin",
    apnsProxyPath: "/apns/send",
    apnsDevicePath: "/3/device/:deviceToken",
    ascBaseUrlEnv: "ASC_API_BASE_URL",
    apps: [{ id: "1234567890", name: "My App", bundle_id: "com.example.app" }],
    review_scenario: "approve",
  },
};
