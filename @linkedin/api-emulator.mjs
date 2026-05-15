const STATE_KEY = "linkedin:state";

function now() {
  return new Date().toISOString();
}

function initialState(config = {}) {
  return {
    profile: config.profile ?? {
      id: "linkedin_member_seed",
      localizedFirstName: "Ada",
      localizedLastName: "Lovelace",
      vanityName: "ada-lovelace",
    },
    organizations: config.organizations ?? [
      {
        id: "urn:li:organization:123456",
        localizedName: "LinkedIn Emulator Company",
        vanityName: "linkedin-emulator-company",
      },
    ],
    adAccounts: config.adAccounts ?? [
      {
        id: "urn:li:sponsoredAccount:123456",
        name: "LinkedIn Emulator Ad Account",
        status: "ACTIVE",
        type: "BUSINESS",
      },
    ],
    campaigns: config.campaigns ?? [
      {
        id: "urn:li:sponsoredCampaign:987654",
        name: "LinkedIn CLI Seed Campaign",
        status: "ACTIVE",
        account: "urn:li:sponsoredAccount:123456",
      },
    ],
    ugcPosts: config.ugcPosts ?? [],
    nextPost: 1,
  };
}

function state(store) {
  const current = store.getData?.(STATE_KEY);
  if (current) return current;
  const next = initialState();
  store.setData?.(STATE_KEY, next);
  return next;
}

function saveState(store, next) {
  store.setData?.(STATE_KEY, next);
}

async function body(c) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

function elements(items, c) {
  const count = Number(c.req.query?.("count") ?? 100);
  return {
    elements: items.slice(0, count),
    paging: { count, start: Number(c.req.query?.("start") ?? 0) },
  };
}

export const contract = {
  provider: "linkedin",
  source: "LinkedIn API v2 and tigillo/linkedin-cli-compatible subset",
  docs: "https://learn.microsoft.com/linkedin/",
  scope: [
    "oauth-token",
    "profile",
    "ugc-posts",
    "organizations",
    "ad-accounts",
    "campaigns",
    "state-inspection",
  ],
  fidelity: "stateful-rest-emulator",
};

export const plugin = {
  name: "linkedin",
  register(app, store) {
    app.post("/oauth/v2/accessToken", (c) =>
      c.json({
        access_token: "linkedin_emulator_access_token",
        expires_in: 3600,
      }),
    );

    app.get("/v2/me", (c) => c.json(state(store).profile));

    app.post("/v2/ugcPosts", async (c) => {
      const s = state(store);
      const input = await body(c);
      const post = {
        id: `urn:li:share:emulator_${s.nextPost++}`,
        createdAt: now(),
        ...input,
      };
      s.ugcPosts.push(post);
      saveState(store, s);
      return c.json(post, 201, { "x-restli-id": post.id });
    });

    app.get("/v2/ugcPosts", (c) => c.json(elements(state(store).ugcPosts, c)));
    app.get("/v2/organizations", (c) =>
      c.json(elements(state(store).organizations, c)),
    );
    app.get("/v2/adAccountsV2", (c) =>
      c.json(elements(state(store).adAccounts, c)),
    );
    app.get("/v2/adCampaignsV2", (c) =>
      c.json(elements(state(store).campaigns, c)),
    );
    app.get("/rest/adAccounts", (c) =>
      c.json(elements(state(store).adAccounts, c)),
    );
    app.get("/rest/adCampaigns", (c) =>
      c.json(elements(state(store).campaigns, c)),
    );
    app.get("/linkedin/inspect/contract", (c) => c.json(contract));
    app.get("/linkedin/inspect/state", (c) => c.json(state(store)));
    app.get("/inspect/contract", (c) => c.json(contract));
    app.get("/inspect/state", (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = "LinkedIn API emulator";
export const endpoints =
  "OAuth token, profile, UGC posts, organizations, ad accounts, campaigns, and state inspection";
export const capabilities = contract.scope;
export const initConfig = { linkedin: initialState() };
export default plugin;
