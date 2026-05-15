import type { Hono } from "hono";
import type { ServicePlugin, Store, WebhookDispatcher, TokenMap, AppEnv, RouteContext } from "@api-emulator/core";
import { appleIdentityRoutes } from "./routes/auth.js";
import { itunesRoutes } from "./routes/itunes.js";
import { apnsRoutes } from "./routes/apns.js";
import { cloudKitRoutes } from "./routes/cloudkit.js";
import { ascCapabilities, ascPlugin } from "./asc.js";

export { getASCStore, type ASCStore } from "./store.js";
export { ascContract, ascCapabilities, ascPlugin, registerASCRoutes, seedASCDefaults, seedFromConfig, type ASCSeedConfig } from "./asc.js";
export * from "./entities.js";

export const contract = {
  provider: "apple",
  source: "Apple APNs provider API, App Store Connect JSON:API conventions, and CloudKit Web Services",
  docs: "https://developer.apple.com/icloud/cloudkit/",
  scope: [
    "ams-auth",
    "sign-in-with-apple-oauth",
    "apns-auth",
    "teams",
    "keys",
    "topics",
    "device-tokens",
    "notifications",
    ...ascCapabilities,
    "cloudkit-web-services",
    "icloud-app-containers",
  ],
  fidelity: "resource-model-subset",
} as const;

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
    ascPlugin.register(app, store, webhooks, baseUrl, tokenMap);
    appleIdentityRoutes(ctx);
    itunesRoutes(ctx);
    apnsRoutes(ctx);
    cloudKitRoutes(ctx);
  },
  seed(store: Store, baseUrl: string): void {
    ascPlugin.seed?.(store, baseUrl);
  },
};

export default plugin;

export const label = "Apple AMS auth, APNS, App Store Connect, and CloudKit emulator";
export const endpoints = "apps, builds, versions, reviewSubmissions, customerReviews, users, ciProducts, ciWorkflows, ciBuildRuns, betaGroups, betaTesters, uploads, analytics, localizations, reviewDetails, certificates, profiles, screenshots, devices, subscriptions, gameCenter, CloudKit records, zones, subscriptions, current user, local APNS, and 30+ more";
export const capabilities = contract.scope;
export const initConfig = {
  apple: {
    emulatorBaseUrl: "same emulator origin",
    apnsProxyPath: "/apns/send",
    apnsDevicePath: "/3/device/:deviceToken",
    ascBaseUrlEnv: "ASC_API_BASE_URL",
    cloudKitBaseUrlEnv: "CLOUDKIT_API_BASE_URL",
    oauthBaseUrlEnv: "APPLEID_AUTH_BASE_URL",
    apps: [{ id: "1234567890", name: "My App", bundle_id: "com.example.app" }],
    review_scenario: "approve",
  },
};
