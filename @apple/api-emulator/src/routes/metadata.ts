import type { RouteContext } from "@api-emulator/core";
import { getASCStore } from "../store.js";
import { ascId, jsonApiResource, jsonApiList, jsonApiError, parseCursor, parseJsonApiBody } from "../jsonapi.js";
import type { Store } from "@api-emulator/core";

interface AppInfoLocalization {
  id: string;
  locale: string;
  name: string | null;
  subtitle: string | null;
  privacy_policy_url: string | null;
  privacy_choices_url: string | null;
  privacy_policy_text: string | null;
}

function getAppInfoLocalizations(store: Store): AppInfoLocalization[] {
  return store.getData<AppInfoLocalization[]>("asc.app_info_localizations") ?? [];
}

function setAppInfoLocalizations(store: Store, locs: AppInfoLocalization[]): void {
  store.setData("asc.app_info_localizations", locs);
}

export function metadataRoutes({ app, store, baseUrl }: RouteContext): void {
  const asc = getASCStore(store);

  // List version localizations
  app.get("/v1/appStoreVersions/:versionId/appStoreVersionLocalizations", (c) => {
    const versionId = c.req.param("versionId");
    const locs = asc.localizations.all().filter((l) => l.version_id === versionId);
    const { cursor, limit } = parseCursor(c);
    const page = locs.slice(cursor, cursor + limit);

    return c.json(
      jsonApiList(
        baseUrl,
        "appStoreVersionLocalizations",
        page.map((l) => ({
          id: l.asc_id,
          attributes: {
            locale: l.locale,
            description: l.description,
            keywords: l.keywords,
            marketingUrl: l.marketing_url,
            promotionalText: l.promotional_text,
            supportUrl: l.support_url,
            whatsNew: l.whats_new,
          },
        })),
        cursor,
        limit,
        locs.length,
      ),
    );
  });

  // Get version localization
  app.get("/v1/appStoreVersionLocalizations/:id", (c) => {
    const id = c.req.param("id");
    const loc = asc.localizations.findOneBy("asc_id", id);
    if (!loc) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `Localization ${id} not found`), 404);
    }
    return c.json(
      jsonApiResource(baseUrl, "appStoreVersionLocalizations", loc.asc_id, {
        locale: loc.locale,
        description: loc.description,
        keywords: loc.keywords,
        marketingUrl: loc.marketing_url,
        promotionalText: loc.promotional_text,
        supportUrl: loc.support_url,
        whatsNew: loc.whats_new,
      }),
    );
  });

  // Create version localization
  app.post("/v1/appStoreVersionLocalizations", async (c) => {
    const body = await parseJsonApiBody(c);
    const locale = (body.attributes.locale as string) ?? "en-US";
    const versionRel = body.relationships?.appStoreVersion;
    const versionId = versionRel?.data?.id ?? "";

    const loc = asc.localizations.insert({
      asc_id: ascId(),
      version_id: versionId,
      locale,
      description: (body.attributes.description as string) ?? null,
      keywords: (body.attributes.keywords as string) ?? null,
      marketing_url: (body.attributes.marketingUrl as string) ?? null,
      promotional_text: (body.attributes.promotionalText as string) ?? null,
      support_url: (body.attributes.supportUrl as string) ?? null,
      whats_new: (body.attributes.whatsNew as string) ?? null,
    });

    return c.json(
      jsonApiResource(baseUrl, "appStoreVersionLocalizations", loc.asc_id, {
        locale: loc.locale,
        description: loc.description,
      }),
      201,
    );
  });

  // Update version localization
  app.patch("/v1/appStoreVersionLocalizations/:id", async (c) => {
    const id = c.req.param("id");
    const loc = asc.localizations.findOneBy("asc_id", id);
    if (!loc) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `Localization ${id} not found`), 404);
    }
    const body = await parseJsonApiBody(c);
    const updates: Record<string, unknown> = {};
    if (body.attributes.description !== undefined) updates.description = body.attributes.description;
    if (body.attributes.keywords !== undefined) updates.keywords = body.attributes.keywords;
    if (body.attributes.marketingUrl !== undefined) updates.marketing_url = body.attributes.marketingUrl;
    if (body.attributes.promotionalText !== undefined) updates.promotional_text = body.attributes.promotionalText;
    if (body.attributes.supportUrl !== undefined) updates.support_url = body.attributes.supportUrl;
    if (body.attributes.whatsNew !== undefined) updates.whats_new = body.attributes.whatsNew;

    const updated = asc.localizations.update(loc.id, updates);
    if (!updated) {
      return c.json(jsonApiError(500, "INTERNAL_ERROR", "Internal Error", "Failed to update"), 500);
    }
    return c.json(
      jsonApiResource(baseUrl, "appStoreVersionLocalizations", updated.asc_id, {
        locale: updated.locale,
        description: updated.description,
        keywords: updated.keywords,
        marketingUrl: updated.marketing_url,
        promotionalText: updated.promotional_text,
        supportUrl: updated.support_url,
        whatsNew: updated.whats_new,
      }),
    );
  });

  // Delete version localization
  app.delete("/v1/appStoreVersionLocalizations/:id", (c) => {
    const id = c.req.param("id");
    const loc = asc.localizations.findOneBy("asc_id", id);
    if (!loc) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `Localization ${id} not found`), 404);
    }
    asc.localizations.delete(loc.id);
    return c.body(null, 204);
  });

  // List app info localizations
  app.get("/v1/appInfos/:appInfoId/appInfoLocalizations", (c) => {
    const locs = getAppInfoLocalizations(store);
    return c.json(jsonApiList(baseUrl, "appInfoLocalizations", locs.map((l) => ({
      id: l.id,
      attributes: { locale: l.locale, name: l.name, subtitle: l.subtitle },
    })), 0, 50, locs.length));
  });

  // Create app info localization
  app.post("/v1/appInfoLocalizations", async (c) => {
    const body = await parseJsonApiBody(c);
    const loc: AppInfoLocalization = {
      id: ascId(),
      locale: (body.attributes.locale as string) ?? "en-US",
      name: (body.attributes.name as string) ?? null,
      subtitle: (body.attributes.subtitle as string) ?? null,
      privacy_policy_url: (body.attributes.privacyPolicyUrl as string) ?? null,
      privacy_choices_url: (body.attributes.privacyChoicesUrl as string) ?? null,
      privacy_policy_text: (body.attributes.privacyPolicyText as string) ?? null,
    };
    const locs = getAppInfoLocalizations(store);
    locs.push(loc);
    setAppInfoLocalizations(store, locs);
    return c.json(jsonApiResource(baseUrl, "appInfoLocalizations", loc.id, { locale: loc.locale, name: loc.name }), 201);
  });

  // Delete app info localization
  app.delete("/v1/appInfoLocalizations/:id", (c) => {
    const id = c.req.param("id");
    const locs = getAppInfoLocalizations(store);
    const idx = locs.findIndex((l) => l.id === id);
    if (idx === -1) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `AppInfoLocalization ${id} not found`), 404);
    }
    locs.splice(idx, 1);
    setAppInfoLocalizations(store, locs);
    return c.body(null, 204);
  });
}
