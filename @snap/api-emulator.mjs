import { createAdPlatformPlugin } from '../scripts/ad-platform-plugin-factory.mjs';

const mod = createAdPlatformPlugin({
  provider: 'snap',
  label: 'Snap Ads',
  docs: 'https://marketingapi.snapchat.com/docs',
  source: 'Snap Marketing API OpenAPI-compatible surface',
});

function now() {
  return new Date().toISOString();
}

function state(store) {
  const current = store.getData?.('snap:ads-state');
  if (current) return current;
  const next = {
    campaigns: [{ id: 'snap_campaign_seed', name: 'Snap Ads Seed Campaign', status: 'active', budget: 100, platform: 'snap', objective: 'conversions', createdAt: now(), updatedAt: now() }],
    ads: [],
    nextCampaignId: 2,
    nextAdId: 1,
  };
  store.setData?.('snap:ads-state', next);
  return next;
}

function hit(store, surface) {
  const hits = store.getData?.('snap:hits') ?? [];
  hits.push({ surface, at: now() });
  store.setData?.('snap:hits', hits);
}

function ok(data) {
  return { request_status: 'SUCCESS', request_id: 'snap_emulator_request', ...data };
}

function campaignPayload(campaign) {
  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status.toUpperCase(),
    objective: campaign.objective ?? 'conversions',
    daily_budget_micro: Math.round(Number(campaign.budget ?? 0) * 1000000),
    created_at: campaign.createdAt,
    updated_at: campaign.updatedAt,
  };
}

function registerSnapTapRoutes(app, store) {
  app.post('/login/oauth2/access_token', (c) => {
    hit(store, 'snap.oauth.token');
    return c.json({
      access_token: 'snap_emulator_access_token',
      token_type: 'Bearer',
      expires_in: 3600,
    });
  });

  app.get('/v1/me/organizations', (c) => {
    hit(store, 'snap.organizations.list');
    return c.json(ok({ organizations: [{ id: 'snap_org_seed', name: 'Snap Emulator Organization' }] }));
  });

  app.get('/v1/organizations/:organizationId/adaccounts', (c) => {
    hit(store, 'snap.adaccounts.list');
    return c.json(ok({
      adaccounts: [{
        id: 'snap_adaccount_seed',
        name: 'Snap Emulator Ad Account',
        organization_id: c.req.param('organizationId'),
        currency: 'USD',
        timezone: 'Etc/UTC',
      }],
    }));
  });

  app.get('/v1/adaccounts/:adAccountId/campaigns', (c) => {
    hit(store, 'snap.tap.campaigns.list');
    return c.json(ok({ campaigns: state(store).campaigns.map(campaignPayload) }));
  });

  app.get('/v1/campaigns/:campaignId/stats', (c) => {
    hit(store, 'snap.campaign.stats');
    return c.json(ok({
      timeseries_stats: [{
        id: c.req.param('campaignId'),
        type: 'CAMPAIGN',
        granularity: 'DAY',
        stats: {
          impressions: 12000,
          swipes: 840,
          spend: 321450000,
          conversion_purchases: 42,
        },
      }],
    }));
  });
}

export const contract = {
  ...mod.contract,
  scope: [...mod.contract.scope, 'oauth', 'organizations', 'adaccounts', 'tap_snapchat_ads'],
};
export const label = mod.label;
export const endpoints = `${mod.endpoints}, OAuth token, organizations/adaccounts/campaigns for tap-snapchat-ads`;
export const capabilities = contract.scope;
export const { initConfig, seedFromConfig } = mod;
export const plugin = {
  ...mod.plugin,
  register(app, store) {
    registerSnapTapRoutes(app, store);
    mod.plugin.register(app, store);
  },
};
export default plugin;
