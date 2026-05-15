import type { RouteContext } from "@api-emulator/core";
import { getASCStore } from "../store.js";
import { seedFromConfig, type ASCSeedConfig } from "../asc.js";
import type { ReviewScenario } from "../entities.js";

/**
 * Admin endpoints for test orchestration.
 * These allow Swift tests to reset state, seed data, and switch
 * review scenarios without restarting the server.
 */
export function adminRoutes({ app, store, baseUrl }: RouteContext): void {
  const asc = getASCStore(store);

  // Reset all state
  app.post("/_admin/reset", (c) => {
    // Clear all collections
    for (const item of asc.apps.all()) asc.apps.delete(item.id);
    for (const item of asc.builds.all()) asc.builds.delete(item.id);
    for (const item of asc.versions.all()) asc.versions.delete(item.id);
    for (const item of asc.reviewSubmissions.all()) asc.reviewSubmissions.delete(item.id);
    for (const item of asc.localizations.all()) asc.localizations.delete(item.id);

    // Clear KV data
    store.setData("asc.review_scenario", "approve");
    store.setData("asc.rejection_reasons", ["METADATA_REJECTED"]);
    store.setData("asc.reviewer_notes", null);
    store.setData("asc.customer_reviews", []);
    store.setData("asc.review_responses", []);
    store.setData("asc.ci_products", []);
    store.setData("asc.ci_workflows", []);
    store.setData("asc.ci_build_runs", []);
    store.setData("asc.beta_groups", []);
    store.setData("asc.beta_testers", []);
    store.setData("asc.beta_build_localizations", []);
    store.setData("asc.users", []);
    store.setData("asc.actors", []);
    store.setData("asc.uploads", []);
    store.setData("asc.review_submission_items", []);
    store.setData("asc.review_attachments", []);
    store.setData("asc.app_info_localizations", []);
    store.setData("asc.analytics_snapshot", null);
    // Clear all CRUD-backed collections
    const crudTypes = [
      "certificates", "profiles", "devices", "bundleIds",
      "appScreenshotSets", "appScreenshots", "appPreviewSets", "appPreviews",
      "appCustomProductPages", "appCustomProductPageVersions",
      "inAppPurchases", "inAppPurchaseImages", "inAppPurchasePriceSchedules",
      "inAppPurchaseAvailabilities", "inAppPurchaseSubmissions",
      "subscriptionGroups", "subscriptions", "subscriptionPricePoints",
      "subscriptionLocalizations", "subscriptionOfferCodes",
      "subscriptionIntroductoryOffers", "subscriptionPromotionalOffers",
      "subscriptionImages", "subscriptionGracePeriods",
      "subscriptionGroupSubmissions", "subscriptionGroupLocalizations",
      "sandboxTesters", "appClips", "appClipDefaultExperiences",
      "appStoreVersionExperiments", "appStoreVersionExperimentTreatments",
      "gameCenterDetails", "gameCenterAchievements", "gameCenterLeaderboards",
      "gameCenterLeaderboardSets", "gameCenterMatchmakingQueues",
      "gameCenterMatchmakingRuleSets", "gameCenterMatchmakingTeams",
      "gameCenterAchievementLocalizations", "gameCenterLeaderboardLocalizations",
      "gameCenterMatchmakingRules",
      "appStoreVersionPhasedReleases", "territories",
      "appEncryptionDeclarations", "endUserLicenseAgreements",
      "betaLicenseAgreements", "diagnosticSignatures",
      "winBackOffers", "alternativeDistributionKeys", "alternativeDistributionDomains",
      "alternativeDistributionPackageVersions",
      "scmProviders", "scmRepositories", "scmPullRequests", "scmGitReferences",
      "territoryAvailabilities", "appEvents", "appEventLocalizations",
      "buildBundles", "appPricePoints", "appPriceSchedules",
      "crashSubmissions", "screenshotSubmissions", "appCategories",
      "ageRatingDeclarations", "promotedPurchases",
      "merchantIds", "passTypeIds", "androidToIosMappings",
      "appStoreConnectWebhooks", "backgroundAssets", "accessibilityDeclarations",
      "betaRecruitmentCriteria", "betaRecruitmentCriterionOptions",
      "nominations", "marketplaceSearchDetails", "marketplaceWebhooks",
      "routingAppCoverages", "submissions",
    ];
    for (const t of crudTypes) {
      store.setData(`asc.crud.${t}`, []);
    }

    return c.json({ ok: true });
  });

  // Seed data
  app.post("/_admin/seed", async (c) => {
    const config = (await c.req.json()) as ASCSeedConfig & Record<string, unknown>;
    seedFromConfig(store, baseUrl, config);

    // Extended seeding for fields not in ASCSeedConfig
    if (config.ci_products) store.setData("asc.ci_products", config.ci_products);
    if (config.ci_workflows) store.setData("asc.ci_workflows", config.ci_workflows);
    if (config.ci_build_runs) store.setData("asc.ci_build_runs", config.ci_build_runs);
    if (config.beta_groups) store.setData("asc.beta_groups", config.beta_groups);
    if (config.beta_testers) store.setData("asc.beta_testers", config.beta_testers);
    if (config.users) store.setData("asc.users", config.users);
    if (config.actors) store.setData("asc.actors", config.actors);
    if (config.customer_reviews) store.setData("asc.customer_reviews", config.customer_reviews);
    if (config.analytics_snapshot) store.setData("asc.analytics_snapshot", config.analytics_snapshot);

    return c.json({ ok: true });
  });

  // Switch review scenario
  app.post("/_admin/scenario", async (c) => {
    const body = (await c.req.json()) as {
      review_scenario?: ReviewScenario;
      rejection_reasons?: string[];
      reviewer_notes?: string | null;
    };

    if (body.review_scenario) {
      store.setData("asc.review_scenario", body.review_scenario);
    }
    if (body.rejection_reasons) {
      store.setData("asc.rejection_reasons", body.rejection_reasons);
    }
    if (body.reviewer_notes !== undefined) {
      store.setData("asc.reviewer_notes", body.reviewer_notes);
    }

    return c.json({ ok: true });
  });

  // Health check
  app.get("/_admin/health", (c) => c.json({ ok: true, service: "asc" }));

  app.get("/inspect/asc/state", (c) => c.json({
    apps: asc.apps.all(),
    builds: asc.builds.all(),
    versions: asc.versions.all(),
    reviewSubmissions: asc.reviewSubmissions.all(),
    localizations: asc.localizations.all(),
    uploads: store.getData("asc.uploads") ?? [],
    buildUploads: store.getData("asc.build_uploads") ?? [],
    buildUploadFiles: store.getData("asc.build_upload_files") ?? [],
    uploadChunks: store.getData("asc.upload_chunks") ?? {},
  }));
}
