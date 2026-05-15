import type { RouteContext } from "@api-emulator/core";
import { registerCrud, registerNestedList, type CrudConfig } from "../crud.js";

/**
 * Full CRUD routes for all ASC services — not empty stubs.
 * Each service gets real store-backed list/get/create/update/delete
 * so the CLI can do complete E2E round-trips without hitting Apple.
 */

export function stubRoutes({ app, store, baseUrl }: RouteContext): void {
  const reg = (config: CrudConfig) => registerCrud(app, store, baseUrl, config);
  const nested = (parentPath: string, config: CrudConfig, parentParam: string, storeField: string) =>
    registerNestedList(app, store, baseUrl, parentPath, config, parentParam, storeField);

  // --- Certificates ---
  const certConfig: CrudConfig = {
    type: "certificates",
    basePath: "/v1/certificates",
    fields: ["certificateType", "displayName", "serialNumber", "platform", "expirationDate", "certificateContent"],
  };
  reg(certConfig);

  // --- Profiles ---
  const profileConfig: CrudConfig = {
    type: "profiles",
    basePath: "/v1/profiles",
    fields: ["name", "profileType", "profileState", "profileContent", "uuid", "platform", "expirationDate"],
  };
  reg(profileConfig);

  // --- Devices ---
  const deviceConfig: CrudConfig = {
    type: "devices",
    basePath: "/v1/devices",
    fields: ["name", "udid", "platform", "status", "deviceClass", "model", "addedDate"],
  };
  reg(deviceConfig);

  // --- Bundle IDs ---
  const bundleIdConfig: CrudConfig = {
    type: "bundleIds",
    basePath: "/v1/bundleIds",
    fields: ["identifier", "name", "platform", "seedId"],
  };
  reg(bundleIdConfig);

  // --- Screenshot Sets ---
  const ssSetConfig: CrudConfig = {
    type: "appScreenshotSets",
    basePath: "/v1/appScreenshotSets",
    fields: ["screenshotDisplayType"],
  };
  reg(ssSetConfig);
  nested("/v1/appStoreVersionLocalizations/:locId/appScreenshotSets", ssSetConfig, "locId", "localization_id");

  // --- Screenshots ---
  const ssConfig: CrudConfig = {
    type: "appScreenshots",
    basePath: "/v1/appScreenshots",
    fields: ["fileSize", "fileName", "sourceFileChecksum", "imageAsset", "assetToken", "uploadOperations"],
  };
  reg(ssConfig);
  nested("/v1/appScreenshotSets/:setId/appScreenshots", ssConfig, "setId", "screenshot_set_id");

  // --- Preview Sets ---
  const previewSetConfig: CrudConfig = {
    type: "appPreviewSets",
    basePath: "/v1/appPreviewSets",
    fields: ["previewType"],
  };
  reg(previewSetConfig);
  nested("/v1/appStoreVersionLocalizations/:locId/appPreviewSets", previewSetConfig, "locId", "localization_id");

  // --- Previews ---
  const previewConfig: CrudConfig = {
    type: "appPreviews",
    basePath: "/v1/appPreviews",
    fields: ["fileSize", "fileName", "sourceFileChecksum", "previewFrameTimeCode", "mimeType", "videoUrl"],
  };
  reg(previewConfig);

  // --- Custom Product Pages ---
  const cppConfig: CrudConfig = {
    type: "appCustomProductPages",
    basePath: "/v1/appCustomProductPages",
    fields: ["name", "url", "visible"],
  };
  reg(cppConfig);
  nested("/v1/apps/:appId/appCustomProductPages", cppConfig, "appId", "app_id");

  // --- Custom Product Page Versions ---
  reg({
    type: "appCustomProductPageVersions",
    basePath: "/v1/appCustomProductPageVersions",
    fields: ["version", "state"],
    readOnly: true,
  });
  nested("/v1/appCustomProductPages/:pageId/appCustomProductPageVersions", {
    type: "appCustomProductPageVersions",
    basePath: "/v1/appCustomProductPageVersions",
    fields: ["version", "state"],
  }, "pageId", "page_id");

  // --- In-App Purchases ---
  const iapConfig: CrudConfig = {
    type: "inAppPurchases",
    basePath: "/v2/inAppPurchases",
    fields: ["name", "productId", "inAppPurchaseType", "state", "reviewNote", "isFamilySharable", "contentHosting"],
  };
  reg(iapConfig);
  nested("/v1/apps/:appId/inAppPurchasesV2", iapConfig, "appId", "app_id");

  // --- IAP Images ---
  reg({
    type: "inAppPurchaseImages",
    basePath: "/v1/inAppPurchaseImages",
    fields: ["fileSize", "fileName", "sourceFileChecksum", "imageAsset", "assetToken"],
  });

  // --- IAP Price Schedules ---
  reg({
    type: "inAppPurchasePriceSchedules",
    basePath: "/v1/inAppPurchasePriceSchedules",
    fields: ["baseTerritory", "manualPrices"],
    readOnly: true,
    noDelete: true,
  });

  // --- IAP Availability ---
  reg({
    type: "inAppPurchaseAvailabilities",
    basePath: "/v1/inAppPurchaseAvailabilities",
    fields: ["availableInNewTerritories"],
    noDelete: true,
  });

  // --- IAP Submissions ---
  reg({ type: "inAppPurchaseSubmissions", basePath: "/v1/inAppPurchaseSubmissions", fields: [] });

  // --- Subscription Groups ---
  const subGroupConfig: CrudConfig = {
    type: "subscriptionGroups",
    basePath: "/v1/subscriptionGroups",
    fields: ["referenceName"],
  };
  reg(subGroupConfig);
  nested("/v1/apps/:appId/subscriptionGroups", subGroupConfig, "appId", "app_id");

  // --- Subscriptions ---
  const subConfig: CrudConfig = {
    type: "subscriptions",
    basePath: "/v1/subscriptions",
    fields: ["name", "productId", "subscriptionPeriod", "groupLevel", "reviewNote", "state", "familySharable"],
    relationshipStoreFields: {
      subscriptionGroup: ["group_id"],
    },
  };
  reg(subConfig);
  nested("/v1/subscriptionGroups/:groupId/subscriptions", subConfig, "groupId", "group_id");

  // --- Subscription Price Points ---
  reg({
    type: "subscriptionPricePoints",
    basePath: "/v1/subscriptionPricePoints",
    fields: ["customerPrice", "proceeds", "proceedsYear2"],
    readOnly: true,
    noDelete: true,
  });
  nested("/v1/subscriptions/:subId/pricePoints", {
    type: "subscriptionPricePoints",
    basePath: "/v1/subscriptionPricePoints",
    fields: ["customerPrice", "proceeds"],
  }, "subId", "subscription_id");

  // --- Subscription Localizations ---
  reg({
    type: "subscriptionLocalizations",
    basePath: "/v1/subscriptionLocalizations",
    fields: ["locale", "name", "description"],
  });

  // --- Subscription Offer Codes ---
  const offerCodeConfig: CrudConfig = {
    type: "subscriptionOfferCodes",
    basePath: "/v1/subscriptionOfferCodes",
    fields: ["name", "customerEligibilities", "offerEligibility", "duration", "offerMode", "numberOfPeriods", "isActive"],
  };
  reg(offerCodeConfig);
  nested("/v1/subscriptions/:subId/offerCodes", offerCodeConfig, "subId", "subscription_id");

  // --- Subscription Introductory Offers ---
  const introConfig: CrudConfig = {
    type: "subscriptionIntroductoryOffers",
    basePath: "/v1/subscriptionIntroductoryOffers",
    fields: ["duration", "offerMode", "numberOfPeriods", "startDate", "endDate"],
  };
  reg(introConfig);
  nested("/v1/subscriptions/:subId/introductoryOffers", introConfig, "subId", "subscription_id");

  // --- Subscription Promotional Offers ---
  const promoConfig: CrudConfig = {
    type: "subscriptionPromotionalOffers",
    basePath: "/v1/subscriptionPromotionalOffers",
    fields: ["name", "offerCode", "duration", "offerMode", "numberOfPeriods"],
  };
  reg(promoConfig);
  nested("/v1/subscriptions/:subId/promotionalOffers", promoConfig, "subId", "subscription_id");

  // --- Subscription Images ---
  reg({
    type: "subscriptionImages",
    basePath: "/v1/subscriptionImages",
    fields: ["fileSize", "fileName", "imageAsset", "assetToken"],
  });

  // --- Subscription Grace Period ---
  reg({
    type: "subscriptionGracePeriods",
    basePath: "/v1/subscriptionGracePeriods",
    fields: ["optIn", "sandboxOptIn", "duration", "renewalType"],
    readOnly: true,
    noDelete: true,
  });

  // --- Subscription Group Submissions ---
  reg({ type: "subscriptionGroupSubmissions", basePath: "/v1/subscriptionGroupSubmissions", fields: [] });

  // --- Subscription Group Localizations ---
  reg({
    type: "subscriptionGroupLocalizations",
    basePath: "/v1/subscriptionGroupLocalizations",
    fields: ["locale", "name", "customAppName"],
  });

  // --- Sandbox Testers ---
  reg({
    type: "sandboxTesters",
    basePath: "/v2/sandboxTesters",
    fields: ["email", "firstName", "lastName", "territory", "interruptPurchases"],
    noDelete: true,
  });

  // --- App Clips ---
  const clipConfig: CrudConfig = {
    type: "appClips",
    basePath: "/v1/appClips",
    fields: ["bundleId"],
    readOnly: true,
    noDelete: true,
  };
  reg(clipConfig);
  nested("/v1/apps/:appId/appClips", clipConfig, "appId", "app_id");

  // --- App Clip Default Experiences ---
  reg({
    type: "appClipDefaultExperiences",
    basePath: "/v1/appClipDefaultExperiences",
    fields: ["action"],
    readOnly: true,
    noDelete: true,
  });
  nested("/v1/appClips/:clipId/appClipDefaultExperiences", {
    type: "appClipDefaultExperiences",
    basePath: "/v1/appClipDefaultExperiences",
    fields: ["action"],
  }, "clipId", "clip_id");

  // --- Experiments ---
  const expConfig: CrudConfig = {
    type: "appStoreVersionExperiments",
    basePath: "/v2/appStoreVersionExperiments",
    fields: ["name", "trafficProportion", "state", "startDate", "endDate"],
  };
  reg(expConfig);

  // --- Experiment Treatments ---
  reg({
    type: "appStoreVersionExperimentTreatments",
    basePath: "/v1/appStoreVersionExperimentTreatments",
    fields: ["name", "appIcon", "appIconName"],
  });

  // --- Sales Reports ---
  // Sales reports return raw CSV/TSV data, not JSON:API
  app.get("/v1/salesReports", (c) => c.body("", 200));
  app.get("/v1/financeReports", (c) => c.body("", 200));

  // --- Game Center ---
  const gcDetailConfig: CrudConfig = {
    type: "gameCenterDetails",
    basePath: "/v1/gameCenterDetails",
    fields: ["arcadeEnabled", "challengeEnabled", "defaultLeaderboard", "defaultGroupLeaderboard"],
    readOnly: true,
    noDelete: true,
  };
  reg(gcDetailConfig);

  const achConfig: CrudConfig = {
    type: "gameCenterAchievements",
    basePath: "/v1/gameCenterAchievements",
    fields: ["referenceName", "vendorIdentifier", "points", "showBeforeEarned", "repeatable", "archived"],
  };
  reg(achConfig);
  nested("/v1/gameCenterDetails/:detailId/gameCenterAchievements", achConfig, "detailId", "detail_id");

  const lbConfig: CrudConfig = {
    type: "gameCenterLeaderboards",
    basePath: "/v1/gameCenterLeaderboards",
    fields: ["referenceName", "vendorIdentifier", "defaultFormatter", "submissionType", "scoreSortType", "archived"],
  };
  reg(lbConfig);
  nested("/v1/gameCenterDetails/:detailId/gameCenterLeaderboards", lbConfig, "detailId", "detail_id");

  const lbSetConfig: CrudConfig = {
    type: "gameCenterLeaderboardSets",
    basePath: "/v1/gameCenterLeaderboardSets",
    fields: ["referenceName", "vendorIdentifier"],
  };
  reg(lbSetConfig);
  nested("/v1/gameCenterDetails/:detailId/gameCenterLeaderboardSets", lbSetConfig, "detailId", "detail_id");

  reg({ type: "gameCenterMatchmakingQueues", basePath: "/v1/gameCenterMatchmakingQueues", fields: ["referenceName", "classicMatchmakingBundleIds"] });
  reg({ type: "gameCenterMatchmakingRuleSets", basePath: "/v1/gameCenterMatchmakingRuleSets", fields: ["referenceName", "ruleLanguageVersion", "minPlayers", "maxPlayers"] });
  reg({ type: "gameCenterMatchmakingTeams", basePath: "/v1/gameCenterMatchmakingTeams", fields: ["referenceName", "minPlayers", "maxPlayers"] });
  reg({ type: "gameCenterAchievementLocalizations", basePath: "/v1/gameCenterAchievementLocalizations", fields: ["locale", "name", "beforeEarnedDescription", "afterEarnedDescription"] });
  reg({ type: "gameCenterLeaderboardLocalizations", basePath: "/v1/gameCenterLeaderboardLocalizations", fields: ["locale", "name", "formatterOverride", "formatterSuffix", "formatterSuffixSingular"] });
  reg({ type: "gameCenterMatchmakingRules", basePath: "/v1/gameCenterMatchmakingRules", fields: ["referenceName", "description", "type", "expression", "weight"] });

  // --- Phased Releases ---
  reg({
    type: "appStoreVersionPhasedReleases",
    basePath: "/v1/appStoreVersionPhasedReleases",
    fields: ["phasedReleaseState", "startDate", "totalPauseDuration", "currentDayNumber"],
  });

  // --- Territories ---
  reg({
    type: "territories",
    basePath: "/v1/territories",
    fields: ["currency"],
    readOnly: true,
    noDelete: true,
  });

  // --- Encryption Declarations ---
  const encConfig: CrudConfig = {
    type: "appEncryptionDeclarations",
    basePath: "/v1/appEncryptionDeclarations",
    fields: ["usesEncryption", "isExempt", "containsProprietaryCryptography", "containsThirdPartyCryptography", "platform"],
    noDelete: true,
  };
  reg(encConfig);
  nested("/v1/apps/:appId/appEncryptionDeclarations", encConfig, "appId", "app_id");

  // --- EULAs ---
  reg({
    type: "endUserLicenseAgreements",
    basePath: "/v1/endUserLicenseAgreements",
    fields: ["agreementText"],
  });

  // --- Beta License Agreements ---
  reg({
    type: "betaLicenseAgreements",
    basePath: "/v1/betaLicenseAgreements",
    fields: ["agreementText"],
    noDelete: true,
  });

  // --- Diagnostic Signatures ---
  const diagSigConfig: CrudConfig = {
    type: "diagnosticSignatures",
    basePath: "/v1/diagnosticSignatures",
    fields: ["diagnosticType", "signature", "weight"],
    readOnly: true,
    noDelete: true,
  };
  reg(diagSigConfig);
  nested("/v1/builds/:buildId/diagnosticSignatures", diagSigConfig, "buildId", "build_id");

  // --- Win-Back Offers ---
  const wboConfig: CrudConfig = {
    type: "winBackOffers",
    basePath: "/v1/winBackOffers",
    fields: ["referenceName", "offerId", "duration", "offerMode", "periodCount", "priority"],
  };
  reg(wboConfig);
  nested("/v1/subscriptions/:subId/winBackOffers", wboConfig, "subId", "subscription_id");

  // --- Alternative Distribution Keys ---
  reg({
    type: "alternativeDistributionKeys",
    basePath: "/v1/alternativeDistributionKeys",
    fields: ["publicKey"],
  });

  // --- Alternative Distribution Domains ---
  reg({
    type: "alternativeDistributionDomains",
    basePath: "/v1/alternativeDistributionDomains",
    fields: ["domain", "referenceName", "createdDate"],
  });

  // --- Alternative Distribution Package Versions ---
  reg({
    type: "alternativeDistributionPackageVersions",
    basePath: "/v1/alternativeDistributionPackageVersions",
    fields: ["version", "state", "url"],
    readOnly: true,
    noDelete: true,
  });

  // --- SCM Providers ---
  reg({
    type: "scmProviders",
    basePath: "/v1/scmProviders",
    fields: ["scmProviderType", "url"],
    readOnly: true,
    noDelete: true,
  });

  // --- SCM Repositories ---
  const scmRepoConfig: CrudConfig = {
    type: "scmRepositories",
    basePath: "/v1/scmRepositories",
    fields: ["httpCloneUrl", "sshCloneUrl", "ownerName", "repositoryName"],
    readOnly: true,
    noDelete: true,
  };
  reg(scmRepoConfig);

  // --- SCM Pull Requests ---
  reg({
    type: "scmPullRequests",
    basePath: "/v1/scmPullRequests",
    fields: ["title", "number", "sourceBranchName", "destinationBranchName", "isClosed"],
    readOnly: true,
    noDelete: true,
  });
  nested("/v1/scmRepositories/:repoId/pullRequests", {
    type: "scmPullRequests",
    basePath: "/v1/scmPullRequests",
    fields: ["title", "number", "sourceBranchName", "destinationBranchName"],
  }, "repoId", "repository_id");

  // --- SCM Git References ---
  reg({
    type: "scmGitReferences",
    basePath: "/v1/scmGitReferences",
    fields: ["name", "canonicalName", "kind"],
    readOnly: true,
    noDelete: true,
  });
  nested("/v1/scmRepositories/:repoId/gitReferences", {
    type: "scmGitReferences",
    basePath: "/v1/scmGitReferences",
    fields: ["name", "canonicalName", "kind"],
  }, "repoId", "repository_id");

  // --- Territory Availabilities (Pre-Order) ---
  reg({
    type: "territoryAvailabilities",
    basePath: "/v1/territoryAvailabilities",
    fields: ["available", "contentStatuses", "preOrderEnabled", "releaseDate"],
    noDelete: true,
  });

  // --- App Events ---
  const eventConfig: CrudConfig = {
    type: "appEvents",
    basePath: "/v1/appEvents",
    fields: ["referenceName", "badge", "deepLink", "purchaseRequirement", "primaryLocale", "priority", "purpose", "eventState", "archivedTerritorySchedules"],
  };
  reg(eventConfig);
  nested("/v1/apps/:appId/appEvents", eventConfig, "appId", "app_id");

  // --- App Event Localizations ---
  reg({
    type: "appEventLocalizations",
    basePath: "/v1/appEventLocalizations",
    fields: ["locale", "name", "shortDescription", "longDescription"],
  });

  // --- Build Bundles ---
  const bundleConfig: CrudConfig = {
    type: "buildBundles",
    basePath: "/v1/buildBundles",
    fields: ["bundleId", "bundleType", "sdkBuild", "platformBuild", "fileName", "hasSirikit", "hasOnDemandResources", "hasPrerenderedIcon", "usesLocationServices", "isNewsstandApp", "includesSymbols"],
    readOnly: true,
    noDelete: true,
  };
  reg(bundleConfig);
  nested("/v1/builds/:buildId/buildBundles", bundleConfig, "buildId", "build_id");

  // --- App Price Points ---
  reg({
    type: "appPricePoints",
    basePath: "/v1/appPricePoints",
    fields: ["customerPrice", "proceeds"],
    readOnly: true,
    noDelete: true,
  });

  // --- App Price Schedules ---
  reg({
    type: "appPriceSchedules",
    basePath: "/v1/appPriceSchedules",
    fields: ["baseTerritory"],
    readOnly: true,
    noDelete: true,
  });

  // --- Crash & Screenshot Submissions ---
  reg({ type: "crashSubmissions", basePath: "/v1/crashSubmissions", fields: ["reportType", "deviceModel", "osVersion"], readOnly: true, noDelete: true });
  reg({ type: "screenshotSubmissions", basePath: "/v1/screenshotSubmissions", fields: ["reportType", "deviceModel", "osVersion"], readOnly: true, noDelete: true });

  // --- Categories ---
  reg({
    type: "appCategories",
    basePath: "/v1/appCategories",
    fields: ["platforms"],
    readOnly: true,
    noDelete: true,
  });

  // --- Age Rating Declarations ---
  reg({
    type: "ageRatingDeclarations",
    basePath: "/v1/ageRatingDeclarations",
    fields: ["alcoholTobaccoOrDrugUseOrReferences", "gamblingAndContests", "horrorOrFearThemes", "matureOrSuggestiveThemes", "medicalOrTreatmentInformation", "profanityOrCrudeHumor", "sexualContentGraphicAndNudity", "sexualContentOrNudity", "violenceCartoonOrFantasy", "violenceRealistic", "violenceRealisticProlongedGraphicOrSadistic"],
    noDelete: true,
  });

  // --- Performance / Xcode Metrics ---
  app.get("/v1/apps/:appId/perfPowerMetrics", (c) => c.json({ productData: [] }));
  app.get("/v1/builds/:buildId/perfPowerMetrics", (c) => c.json({ productData: [] }));

  // --- Promoted Purchases ---
  const ppConfig: CrudConfig = {
    type: "promotedPurchases",
    basePath: "/v1/promotedPurchases",
    fields: ["visibleForAllUsers", "enabled", "state"],
  };
  reg(ppConfig);
  nested("/v1/apps/:appId/promotedPurchases", ppConfig, "appId", "app_id");

  // --- Merchant IDs ---
  reg({
    type: "merchantIds",
    basePath: "/v1/merchantIds",
    fields: ["name", "identifier"],
  });

  // --- Pass Type IDs ---
  reg({
    type: "passTypeIds",
    basePath: "/v1/passTypeIds",
    fields: ["name", "identifier"],
  });

  // --- Android to iOS Mapping ---
  const mappingConfig: CrudConfig = {
    type: "androidToIosMappings",
    basePath: "/v1/androidToIosMappings",
    fields: ["packageName", "sha256Fingerprints"],
  };
  reg(mappingConfig);
  nested("/v1/apps/:appId/androidToIosMappings", mappingConfig, "appId", "app_id");

  // --- Webhooks ---
  const whConfig: CrudConfig = {
    type: "appStoreConnectWebhooks",
    basePath: "/v1/appStoreConnectWebhooks",
    fields: ["name", "url", "eventTypes", "isEnabled", "secret"],
  };
  reg(whConfig);
  nested("/v1/apps/:appId/appStoreConnectWebhooks", whConfig, "appId", "app_id");

  // --- Background Assets ---
  const baConfig: CrudConfig = {
    type: "backgroundAssets",
    basePath: "/v1/backgroundAssets",
    fields: ["assetPackIdentifier", "isArchived"],
  };
  reg(baConfig);
  nested("/v1/apps/:appId/backgroundAssets", baConfig, "appId", "app_id");

  // --- Accessibility Declarations ---
  const accConfig: CrudConfig = {
    type: "accessibilityDeclarations",
    basePath: "/v1/accessibilityDeclarations",
    fields: ["isPublish", "supportsAudioDescriptions", "supportsCaptions", "supportsDarkInterface", "supportsDifferentiateWithoutColorAlone", "supportsLargerText", "supportsReducedMotion", "supportsSufficientContrast", "supportsVoiceControl", "supportsVoiceover"],
    noDelete: true,
  };
  reg(accConfig);
  nested("/v1/apps/:appId/accessibilityDeclarations", accConfig, "appId", "app_id");

  // --- Beta Recruitment Criteria ---
  reg({
    type: "betaRecruitmentCriteria",
    basePath: "/v1/betaRecruitmentCriteria",
    fields: ["deviceFamilyOsVersionFilters"],
  });

  // --- Beta Recruitment Criterion Options ---
  reg({
    type: "betaRecruitmentCriterionOptions",
    basePath: "/v1/betaRecruitmentCriterionOptions",
    fields: ["deviceFamily", "osVersion"],
    readOnly: true,
    noDelete: true,
  });

  // --- Nominations ---
  reg({
    type: "nominations",
    basePath: "/v1/nominations",
    fields: ["name", "type", "description"],
  });

  // --- Marketplace ---
  reg({
    type: "marketplaceSearchDetails",
    basePath: "/v1/marketplaceSearchDetails",
    fields: ["catalogUrl"],
  });
  reg({
    type: "marketplaceWebhooks",
    basePath: "/v1/marketplaceWebhooks",
    fields: ["endpointUrl", "secret"],
  });

  // --- Routing Coverage ---
  reg({
    type: "routingAppCoverages",
    basePath: "/v1/routingAppCoverages",
    fields: ["fileName", "fileSize", "sourceFileChecksum", "assetDeliveryState"],
  });

  // --- Notary ---
  reg({
    type: "submissions",
    basePath: "/notary/v2/submissions",
    fields: ["submissionName", "sha256", "status", "createdDate"],
  });
}
