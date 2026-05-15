import type { RouteContext } from "@api-emulator/core";
import { getASCStore } from "../store.js";
import { ascId, jsonApiResource, jsonApiList, jsonApiError, parseCursor, parseJsonApiBody } from "../jsonapi.js";

export function appRoutes({ app, store, baseUrl }: RouteContext): void {
  const asc = getASCStore(store);

  // List apps
  app.get("/v1/apps", (c) => {
    const all = asc.apps.all();
    const { cursor, limit } = parseCursor(c);
    const page = all.slice(cursor, cursor + limit);

    return c.json(
      jsonApiList(
        baseUrl,
        "apps",
        page.map((a) => ({
          id: a.asc_id,
          attributes: {
            name: a.name,
            bundleId: a.bundle_id,
            primaryLocale: a.primary_locale,
          },
        })),
        cursor,
        limit,
        all.length,
      ),
    );
  });

  // Get app by ID
  app.get("/v1/apps/:id", (c) => {
    const id = c.req.param("id");
    const found = asc.apps.findOneBy("asc_id", id);
    if (!found) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `App ${id} not found`), 404);
    }
    return c.json(
      jsonApiResource(baseUrl, "apps", found.asc_id, {
        name: found.name,
        bundleId: found.bundle_id,
        primaryLocale: found.primary_locale,
      }),
    );
  });

  // Update app
  app.patch("/v1/apps/:id", async (c) => {
    const id = c.req.param("id");
    const found = asc.apps.findOneBy("asc_id", id);
    if (!found) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `App ${id} not found`), 404);
    }
    const body = await parseJsonApiBody(c);
    const updates: Record<string, unknown> = {};
    if (body.attributes.bundleId !== undefined) updates.bundle_id = body.attributes.bundleId;
    if (body.attributes.primaryLocale !== undefined) updates.primary_locale = body.attributes.primaryLocale;
    if (body.attributes.name !== undefined) updates.name = body.attributes.name;

    const updated = asc.apps.update(found.id, updates);
    if (!updated) {
      return c.json(jsonApiError(500, "INTERNAL_ERROR", "Internal Error", "Failed to update"), 500);
    }
    return c.json(
      jsonApiResource(baseUrl, "apps", updated.asc_id, {
        name: updated.name,
        bundleId: updated.bundle_id,
        primaryLocale: updated.primary_locale,
      }),
    );
  });

  // App info
  app.get("/v1/apps/:id/appInfos", (c) => {
    const id = c.req.param("id");
    return c.json(
      jsonApiList(baseUrl, "appInfos", [{ id, attributes: {} }], 0, 50, 1),
    );
  });

  // List builds
  app.get("/v1/builds", (c) => {
    const appFilter = c.req.query("filter[app]");
    const { cursor, limit } = parseCursor(c);
    let all = asc.builds.all();
    if (appFilter) {
      all = all.filter((b) => b.app_id === appFilter);
    }
    const page = all.slice(cursor, cursor + limit);

    return c.json(
      jsonApiList(
        baseUrl,
        "builds",
        page.map((b) => ({
          id: b.asc_id,
          attributes: {
            version: b.version,
            buildNumber: b.version,
            processingState: b.processing_state,
            expired: b.is_expired,
          },
        })),
        cursor,
        limit,
        all.length,
      ),
    );
  });

  // Get build
  app.get("/v1/builds/:id", (c) => {
    const id = c.req.param("id");
    const found = asc.builds.findOneBy("asc_id", id);
    if (!found) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `Build ${id} not found`), 404);
    }
    return c.json(
      jsonApiResource(baseUrl, "builds", found.asc_id, {
        version: found.version,
        buildNumber: found.version,
        processingState: found.processing_state,
        expired: found.is_expired,
      }),
    );
  });

  // Expire build
  app.delete("/v1/builds/:id", (c) => {
    const id = c.req.param("id");
    const found = asc.builds.findOneBy("asc_id", id);
    if (!found) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `Build ${id} not found`), 404);
    }
    asc.builds.delete(found.id);
    return c.body(null, 204);
  });

  // List versions
  app.get("/v1/apps/:appId/appStoreVersions", (c) => {
    const appId = c.req.param("appId");
    const { cursor, limit } = parseCursor(c);
    const all = asc.versions.all().filter((v) => v.app_id === appId);
    const page = all.slice(cursor, cursor + limit);

    return c.json(
      jsonApiList(
        baseUrl,
        "appStoreVersions",
        page.map((v) => ({
          id: v.asc_id,
          attributes: {
            versionString: v.version_string,
            platform: v.platform,
            appStoreState: v.app_store_state,
          },
        })),
        cursor,
        limit,
        all.length,
      ),
    );
  });

  // Get version
  app.get("/v1/appStoreVersions/:id", (c) => {
    const id = c.req.param("id");
    const found = asc.versions.findOneBy("asc_id", id);
    if (!found) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `Version ${id} not found`), 404);
    }
    return c.json(
      jsonApiResource(baseUrl, "appStoreVersions", found.asc_id, {
        versionString: found.version_string,
        platform: found.platform,
        appStoreState: found.app_store_state,
      }),
    );
  });

  // Create version
  app.post("/v1/appStoreVersions", async (c) => {
    const body = await parseJsonApiBody(c);
    const versionString = (body.attributes.versionString as string) ?? "1.0.0";
    const platform = (body.attributes.platform as string) ?? "IOS";
    const appRel = body.relationships?.app;
    const appId = appRel?.data?.id ?? "";

    const version = asc.versions.insert({
      asc_id: ascId(),
      app_id: appId,
      version_string: versionString,
      platform: platform as "IOS" | "MAC_OS" | "TV_OS" | "VISION_OS",
      app_store_state: "PREPARE_FOR_SUBMISSION",
    });

    return c.json(
      jsonApiResource(baseUrl, "appStoreVersions", version.asc_id, {
        versionString: version.version_string,
        platform: version.platform,
        appStoreState: version.app_store_state,
      }),
      201,
    );
  });

  app.patch("/v1/appStoreVersions/:id/relationships/build", async (c) => {
    const id = c.req.param("id");
    const found = asc.versions.findOneBy("asc_id", id);
    if (!found) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `Version ${id} not found`), 404);
    }
    const body = await c.req.json().catch(() => ({})) as any;
    const buildId = body?.data?.id;
    if (!buildId || !asc.builds.findOneBy("asc_id", buildId)) {
      return c.json(jsonApiError(409, "INVALID_RELATIONSHIP", "Invalid Relationship", "Build relationship is invalid"), 409);
    }
    store.setData(`asc.version.${id}.build`, buildId);
    return c.json({ data: { type: "builds", id: buildId } });
  });

  app.get("/v1/apps/:id/appPriceSchedule", (c) => {
    const id = c.req.param("id");
    return c.json(jsonApiResource(baseUrl, "appPriceSchedules", `price-schedule-${id}`, {
      appId: id,
      customerPrice: 0,
      proceeds: 0,
    }));
  });
}
