const timestamp = '2026-01-01T00:00:00Z';

function initialState(config = {}) {
  return {
    organization: config.organization ?? {
      id: 'unity_org_emulator',
      name: 'Unity Ads Emulator Organization',
    },
    apps: config.apps ?? [
      {
        id: 'unity_game_seed',
        name: 'Emulator Quest',
        platform: 'ios',
        storeId: '1234567890',
        bundleId: 'com.example.emulator',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    campaigns: config.campaigns ?? [
      {
        id: 'unity_campaign_seed',
        appId: 'unity_game_seed',
        name: 'Unity Ads Seed Campaign',
        objective: 'installs',
        status: 'active',
        dailyBudget: 100,
        currency: 'USD',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    nextApp: 2,
    nextCampaign: 2,
  };
}

function state(store) {
  const current = store.getData?.('unity-ads:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('unity-ads:state', next);
  return next;
}

function save(store, next) {
  store.setData?.('unity-ads:state', next);
}

function hit(store, surface) {
  const hits = store.getData?.('unity-ads:hits') ?? [];
  hits.push({ surface, at: new Date().toISOString() });
  store.setData?.('unity-ads:hits', hits);
}

function unityError(c, status, title, detail, code = status) {
  return c.json({
    title,
    detail,
    code,
    type: `https://services.docs.unity.com/docs/errors/#${code}`,
    status,
    requestId: 'unity-ads-emulator-request',
  }, status);
}

function monetizationAuth(c) {
  const auth = c.req.header?.('authorization') ?? '';
  return Boolean(c.req.query('apikey') || auth.toLowerCase().startsWith('token '));
}

function envelope(data, nextToken = null) {
  return { results: data, nextToken };
}

function appPayload(app) {
  return {
    id: app.id,
    name: app.name,
    platform: app.platform,
    storeId: app.storeId,
    bundleId: app.bundleId,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };
}

function campaignPayload(campaign) {
  return {
    id: campaign.id,
    appId: campaign.appId,
    name: campaign.name,
    objective: campaign.objective,
    status: campaign.status,
    dailyBudget: campaign.dailyBudget,
    currency: campaign.currency,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

function statsRows(c) {
  const fields = String(c.req.query('fields') ?? 'adrequest_count,available_sum,revenue_sum,start_count,view_count').split(',').map((item) => item.trim()).filter(Boolean);
  const groups = String(c.req.query('groupBy') ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  const base = {
    timestamp: c.req.query('start') ?? timestamp,
    placement: 'rewarded_video',
    country: 'US',
    platform: 'ios',
    game: 'unity_game_seed',
    adrequest_count: 12000,
    available_sum: 11880,
    revenue_sum: 654.32,
    start_count: 840,
    view_count: 790,
  };
  return [Object.fromEntries(['timestamp', ...groups, ...fields].map((key) => [key, base[key] ?? 'emulator']))];
}

function acquisitionRows(c) {
  const fields = String(c.req.query('fields') ?? 'clicks,installs,spend').split(',').map((item) => item.trim()).filter(Boolean);
  const groups = String(c.req.query('groupBy') ?? 'campaign').split(',').map((item) => item.trim()).filter(Boolean);
  const base = {
    timestamp: c.req.query('start') ?? timestamp,
    campaign: 'unity_campaign_seed',
    app: 'unity_game_seed',
    country: 'US',
    platform: 'ios',
    clicks: 840,
    installs: 42,
    spend: 321.45,
  };
  return [Object.fromEntries(['timestamp', ...groups, ...fields].map((key) => [key, base[key] ?? 'emulator']))];
}

function csv(rows) {
  const columns = Object.keys(rows[0]);
  return `${columns.join(',')}\n${rows.map((row) => columns.map((column) => row[column]).join(',')).join('\n')}\n`;
}

function statsResponse(c, rows) {
  if ((c.req.header?.('accept') ?? '').includes('application/json')) return c.json({ data: rows });
  return c.text(csv(rows), 200, { 'content-type': 'text/csv' });
}

function validateStats(c) {
  for (const field of ['fields', 'scale', 'start', 'end']) {
    if (!c.req.query(field)) return `required query parameter ${field} is missing`;
  }
  return null;
}

export const contract = {
  provider: 'unity-ads',
  source: 'Unity Advertising Management, Advertising Statistics, and Monetization Stats API docs',
  docs: 'https://services.docs.unity.com/advertise/v1/',
  baseUrl: ['https://services.api.unity.com', 'https://monetization.api.unity.com'],
  auth: 'Unity service-account Basic/Bearer auth for services APIs; Monetization Stats apikey query or Authorization: Token header',
  scope: ['auth-token-exchange', 'advertise-apps', 'advertise-campaigns', 'advertising-statistics', 'monetization-stats', 'inspect'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'unity-ads',
  register(app, store) {
    app.post('/auth/v1/token-exchange', (c) => {
      hit(store, 'unity.auth.token-exchange');
      return c.json({ accessToken: 'unity_ads_emulator_access_token' });
    });

    app.get('/advertise/v1/organizations/:organizationId/apps', (c) => {
      hit(store, 'unity.advertise.apps.list');
      return c.json(envelope(state(store).apps.map(appPayload)));
    });

    app.post('/advertise/v1/organizations/:organizationId/apps', async (c) => {
      hit(store, 'unity.advertise.apps.create');
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      if (!body.name) return unityError(c, 400, 'Bad Request', 'name is required', 40000);
      const appRecord = {
        id: `unity_game_${s.nextApp++}`,
        name: body.name,
        platform: body.platform ?? 'ios',
        storeId: body.storeId ?? body.store_id ?? '0000000000',
        bundleId: body.bundleId ?? body.bundle_id ?? 'com.example.created',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      s.apps.push(appRecord);
      save(store, s);
      return c.json(appPayload(appRecord), 201);
    });

    app.get('/advertise/v1/apps/:appId', (c) => {
      const appRecord = state(store).apps.find((item) => item.id === c.req.param('appId'));
      if (!appRecord) return unityError(c, 404, 'Not Found', 'app not found', 40400);
      return c.json(appPayload(appRecord));
    });

    app.get('/advertise/v1/apps/:appId/campaigns', (c) => {
      hit(store, 'unity.advertise.campaigns.list');
      return c.json(envelope(state(store).campaigns.filter((campaign) => campaign.appId === c.req.param('appId')).map(campaignPayload)));
    });

    app.post('/advertise/v1/apps/:appId/campaigns', async (c) => {
      hit(store, 'unity.advertise.campaigns.create');
      const s = state(store);
      if (!s.apps.some((item) => item.id === c.req.param('appId'))) return unityError(c, 404, 'Not Found', 'app not found', 40400);
      const body = await c.req.json().catch(() => ({}));
      if (!body.name) return unityError(c, 400, 'Bad Request', 'name is required', 40000);
      const campaign = {
        id: `unity_campaign_${s.nextCampaign++}`,
        appId: c.req.param('appId'),
        name: body.name,
        objective: body.objective ?? 'installs',
        status: body.status ?? 'paused',
        dailyBudget: Number(body.dailyBudget ?? body.daily_budget ?? 0),
        currency: body.currency ?? 'USD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      s.campaigns.push(campaign);
      save(store, s);
      return c.json(campaignPayload(campaign), 201);
    });

    app.get('/advertise/v1/campaigns/:campaignId', (c) => {
      const campaign = state(store).campaigns.find((item) => item.id === c.req.param('campaignId'));
      if (!campaign) return unityError(c, 404, 'Not Found', 'campaign not found', 40400);
      return c.json(campaignPayload(campaign));
    });

    app.patch('/advertise/v1/campaigns/:campaignId', async (c) => {
      const s = state(store);
      const campaign = s.campaigns.find((item) => item.id === c.req.param('campaignId'));
      if (!campaign) return unityError(c, 404, 'Not Found', 'campaign not found', 40400);
      const body = await c.req.json().catch(() => ({}));
      Object.assign(campaign, {
        name: body.name ?? campaign.name,
        objective: body.objective ?? campaign.objective,
        status: body.status ?? campaign.status,
        dailyBudget: Number(body.dailyBudget ?? body.daily_budget ?? campaign.dailyBudget),
        currency: body.currency ?? campaign.currency,
        updatedAt: new Date().toISOString(),
      });
      save(store, s);
      return c.json(campaignPayload(campaign));
    });

    app.delete('/advertise/v1/campaigns/:campaignId', (c) => {
      const s = state(store);
      const campaign = s.campaigns.find((item) => item.id === c.req.param('campaignId'));
      if (!campaign) return unityError(c, 404, 'Not Found', 'campaign not found', 40400);
      campaign.status = 'deleted';
      campaign.updatedAt = new Date().toISOString();
      save(store, s);
      return c.json({ id: campaign.id, deleted: true });
    });

    app.get('/stats/v1/operate/organizations/:organizationId', (c) => {
      hit(store, 'unity.monetization.stats');
      if (!monetizationAuth(c)) return c.json({ errors: [{ msg: 'access token required' }] }, 400);
      const validation = validateStats(c);
      if (validation) return c.json({ errors: [{ msg: validation }] }, 400);
      return statsResponse(c, statsRows(c));
    });

    app.get('/statistics/v2/organizations/:organizationId/reports', (c) => {
      hit(store, 'unity.advertising.statistics');
      const validation = validateStats(c);
      if (validation) return unityError(c, 400, 'Bad Request', validation, 40000);
      return statsResponse(c, acquisitionRows(c));
    });

    app.get('/unity-ads/inspect/contract', (c) => c.json(contract));
    app.get('/unity-ads/inspect/state', (c) => c.json(state(store)));
    app.get('/unity-ads/inspect/hits', (c) => c.json(store.getData?.('unity-ads:hits') ?? []));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  save(store, initialState(config));
}

export const label = 'Unity Ads API emulator';
export const endpoints = 'auth token exchange, advertise apps/campaigns, advertising statistics, monetization stats';
export const capabilities = contract.scope;
export const initConfig = { unityAds: initialState() };
export default plugin;
