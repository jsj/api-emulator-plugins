import type { RouteContext, Store } from "@emulators/core";
import { ascId, jsonApiResource, jsonApiList, jsonApiError, parseCursor, parseJsonApiBody } from "../jsonapi.js";

interface BetaGroup {
  id: string;
  app_id: string;
  name: string;
  is_internal_group: boolean;
  public_link_enabled: boolean;
  created_date: string | null;
}

interface BetaTester {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  invite_type: string | null;
  state: string | null;
}

interface BetaBuildLocalization {
  id: string;
  build_id: string;
  locale: string;
  whats_new: string;
}

function getBetaGroups(store: Store): BetaGroup[] {
  return store.getData<BetaGroup[]>("asc.beta_groups") ?? [];
}

function setBetaGroups(store: Store, groups: BetaGroup[]): void {
  store.setData("asc.beta_groups", groups);
}

function getBetaTesters(store: Store): BetaTester[] {
  return store.getData<BetaTester[]>("asc.beta_testers") ?? [];
}

function setBetaTesters(store: Store, testers: BetaTester[]): void {
  store.setData("asc.beta_testers", testers);
}

function getLocalizations(store: Store): BetaBuildLocalization[] {
  return store.getData<BetaBuildLocalization[]>("asc.beta_build_localizations") ?? [];
}

function setLocalizations(store: Store, locs: BetaBuildLocalization[]): void {
  store.setData("asc.beta_build_localizations", locs);
}

export function testflightRoutes({ app, store, baseUrl }: RouteContext): void {
  // List beta groups
  app.get("/v1/betaGroups", (c) => {
    const groups = getBetaGroups(store);
    const appFilter = c.req.query("filter[app]");
    const { cursor, limit } = parseCursor(c);

    let filtered = groups;
    if (appFilter) {
      filtered = groups.filter((g) => g.app_id === appFilter);
    }
    const page = filtered.slice(cursor, cursor + limit);

    return c.json(
      jsonApiList(
        baseUrl,
        "betaGroups",
        page.map((g) => ({
          id: g.id,
          attributes: {
            name: g.name,
            isInternalGroup: g.is_internal_group,
            publicLinkEnabled: g.public_link_enabled,
            createdDate: g.created_date,
          },
        })),
        cursor,
        limit,
        filtered.length,
      ),
    );
  });

  // Create beta group
  app.post("/v1/betaGroups", async (c) => {
    const body = await parseJsonApiBody(c);
    const name = (body.attributes.name as string) ?? "";
    const isInternal = (body.attributes.isInternalGroup as boolean) ?? false;
    const publicLink = (body.attributes.publicLinkEnabled as boolean) ?? false;
    const appRel = body.relationships?.app;
    const appId = appRel?.data?.id ?? "";

    const group: BetaGroup = {
      id: ascId(),
      app_id: appId,
      name,
      is_internal_group: isInternal,
      public_link_enabled: publicLink,
      created_date: new Date().toISOString(),
    };

    const groups = getBetaGroups(store);
    groups.push(group);
    setBetaGroups(store, groups);

    return c.json(
      jsonApiResource(baseUrl, "betaGroups", group.id, {
        name: group.name,
        isInternalGroup: group.is_internal_group,
        publicLinkEnabled: group.public_link_enabled,
        createdDate: group.created_date,
      }),
      201,
    );
  });

  // Delete beta group
  app.delete("/v1/betaGroups/:id", (c) => {
    const id = c.req.param("id");
    const groups = getBetaGroups(store);
    const idx = groups.findIndex((g) => g.id === id);
    if (idx === -1) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `BetaGroup ${id} not found`), 404);
    }
    groups.splice(idx, 1);
    setBetaGroups(store, groups);
    return c.body(null, 204);
  });

  // List beta testers
  app.get("/v1/betaTesters", (c) => {
    const testers = getBetaTesters(store);
    const groupFilter = c.req.query("filter[betaGroups]");
    const { cursor, limit } = parseCursor(c);
    const page = testers.slice(cursor, cursor + limit);

    return c.json(
      jsonApiList(
        baseUrl,
        "betaTesters",
        page.map((t) => ({
          id: t.id,
          attributes: {
            email: t.email,
            firstName: t.first_name,
            lastName: t.last_name,
            inviteType: t.invite_type,
            state: t.state,
          },
        })),
        cursor,
        limit,
        testers.length,
      ),
    );
  });

  // Add beta tester
  app.post("/v1/betaTesters", async (c) => {
    const body = await parseJsonApiBody(c);
    const email = (body.attributes.email as string) ?? "";
    const firstName = (body.attributes.firstName as string) ?? null;
    const lastName = (body.attributes.lastName as string) ?? null;

    const tester: BetaTester = {
      id: ascId(),
      email,
      first_name: firstName,
      last_name: lastName,
      invite_type: null,
      state: null,
    };

    const testers = getBetaTesters(store);
    testers.push(tester);
    setBetaTesters(store, testers);

    return c.json(
      jsonApiResource(baseUrl, "betaTesters", tester.id, {
        email: tester.email,
        firstName: tester.first_name,
        lastName: tester.last_name,
      }),
      201,
    );
  });

  // Beta build localizations
  app.get("/v1/builds/:buildId/betaBuildLocalizations", (c) => {
    const buildId = c.req.param("buildId");
    const locs = getLocalizations(store).filter((l) => l.build_id === buildId);

    return c.json(
      jsonApiList(
        baseUrl,
        "betaBuildLocalizations",
        locs.map((l) => ({
          id: l.id,
          attributes: { locale: l.locale, whatsNew: l.whats_new },
        })),
        0,
        50,
        locs.length,
      ),
    );
  });

  // Create beta build localization
  app.post("/v1/betaBuildLocalizations", async (c) => {
    const body = await parseJsonApiBody(c);
    const locale = (body.attributes.locale as string) ?? "en-US";
    const whatsNew = (body.attributes.whatsNew as string) ?? "";
    const buildRel = body.relationships?.build;
    const buildId = buildRel?.data?.id ?? "";

    const loc: BetaBuildLocalization = { id: ascId(), build_id: buildId, locale, whats_new: whatsNew };
    const locs = getLocalizations(store);
    locs.push(loc);
    setLocalizations(store, locs);

    return c.json(
      jsonApiResource(baseUrl, "betaBuildLocalizations", loc.id, { locale: loc.locale, whatsNew: loc.whats_new }),
      201,
    );
  });

  // Update beta build localization
  app.patch("/v1/betaBuildLocalizations/:id", async (c) => {
    const id = c.req.param("id");
    const locs = getLocalizations(store);
    const idx = locs.findIndex((l) => l.id === id);
    if (idx === -1) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `BetaBuildLocalization ${id} not found`), 404);
    }

    const body = await parseJsonApiBody(c);
    if (body.attributes.whatsNew !== undefined) {
      locs[idx].whats_new = body.attributes.whatsNew as string;
    }
    setLocalizations(store, locs);

    return c.json(
      jsonApiResource(baseUrl, "betaBuildLocalizations", locs[idx].id, {
        locale: locs[idx].locale,
        whatsNew: locs[idx].whats_new,
      }),
    );
  });

  // Delete beta build localization
  app.delete("/v1/betaBuildLocalizations/:id", (c) => {
    const id = c.req.param("id");
    const locs = getLocalizations(store);
    const idx = locs.findIndex((l) => l.id === id);
    if (idx === -1) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `BetaBuildLocalization ${id} not found`), 404);
    }
    locs.splice(idx, 1);
    setLocalizations(store, locs);
    return c.body(null, 204);
  });

  // Beta app review detail
  app.get("/v1/apps/:appId/betaAppReviewDetail", (c) => {
    const appId = c.req.param("appId");
    return c.json(
      jsonApiResource(baseUrl, "betaAppReviewDetails", `review-detail-${appId}`, {}),
    );
  });
}
