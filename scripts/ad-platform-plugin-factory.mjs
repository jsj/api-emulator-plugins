function now() {
  return new Date().toISOString();
}

function initialState(provider, config = {}) {
  const seeded = Array.isArray(config.campaigns) ? config.campaigns : [];
  return {
    campaigns: seeded.map((campaign, index) => ({
      id: campaign.id ?? `${provider}_campaign_${index + 1}`,
      name: campaign.name ?? `${provider} Campaign ${index + 1}`,
      status: campaign.status ?? 'active',
      budget: Number(campaign.budget ?? 100),
      platform: provider,
      objective: campaign.objective ?? 'conversions',
      createdAt: campaign.createdAt ?? now(),
      updatedAt: campaign.updatedAt ?? now(),
    })),
    ads: [],
    nextCampaignId: seeded.length + 1,
    nextAdId: 1,
  };
}

function state(store, provider) {
  const key = `${provider}:ads-state`;
  const current = store.getData?.(key);
  if (current) return current;
  const next = initialState(provider);
  store.setData?.(key, next);
  return next;
}

function saveState(store, provider, next) {
  store.setData?.(`${provider}:ads-state`, next);
}

function metricReport(provider, body) {
  const impressions = 12000;
  const clicks = 840;
  const spend = 321.45;
  return {
    date: body.date ?? new Date().toISOString().split('T')[0],
    platform: provider,
    campaignId: body.campaignId,
    metrics: {
      spend,
      impressions,
      clicks,
      ctr: clicks / impressions,
      cpc: spend / clicks,
      conversions: 42,
    },
  };
}

function toTikTokCampaign(campaign) {
  return {
    campaign_id: campaign.id,
    campaign_name: campaign.name,
    status: campaign.status === 'paused' ? 'DISABLE' : campaign.status === 'archived' ? 'DELETE' : 'ENABLE',
    budget: campaign.budget,
    created_at: Math.floor(new Date(campaign.createdAt).getTime() / 1000),
    updated_at: Math.floor(new Date(campaign.updatedAt).getTime() / 1000),
  };
}

function toGoogleCampaign(campaign, customerId = 'emulator-account') {
  return {
    campaign: {
      resourceName: `customers/${customerId}/campaigns/${campaign.id}`,
      id: campaign.id,
      name: campaign.name,
      status: campaign.status === 'paused' ? 'PAUSED' : campaign.status === 'archived' ? 'REMOVED' : 'ENABLED',
      biddingStrategyType: 'CLICK_CPC',
      startDate: campaign.createdAt.split('T')[0].replaceAll('-', ''),
    },
    metrics: {
      costMicros: 321450000,
      impressions: 12000,
      clicks: 840,
      ctr: 0.07,
      averageCpc: 382679,
      conversions: 42,
    },
  };
}

function toMetaCampaign(campaign) {
  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status === 'paused' ? 'PAUSED' : campaign.status === 'archived' ? 'ARCHIVED' : 'ACTIVE',
    daily_budget: Math.round(campaign.budget * 100),
    objective: String(campaign.objective ?? 'conversions').toUpperCase(),
    created_time: campaign.createdAt,
    updated_time: campaign.updatedAt,
  };
}

async function metaBody(c) {
  const parsed = await c.req.json().catch(async () => c.req.parseBody?.() ?? {});
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function toSnapCampaign(campaign) {
  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status.toUpperCase(),
    daily_budget_micro: Math.round(campaign.budget * 1000000),
    objective: campaign.objective ?? 'conversions',
    created_at: campaign.createdAt,
    updated_at: campaign.updatedAt,
  };
}

function toAppLovinCampaign(campaign) {
  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    daily_budget: campaign.budget,
    goal: campaign.objective ?? 'conversions',
    created_at: campaign.createdAt,
    updated_at: campaign.updatedAt,
  };
}

export function createAdPlatformPlugin({ provider, label, docs, source, scope }) {
  const contract = {
    provider,
    source,
    docs,
    scope: scope ?? ['campaigns', 'ads', 'reports', 'inspect'],
    fidelity: 'stateful-rest-emulator',
  };

  const plugin = {
    name: provider,
    register(app, store) {
      app.get('/campaigns', (c) => {
        let campaigns = state(store, provider).campaigns;
        const status = c.req.query('status');
        if (status) campaigns = campaigns.filter((campaign) => campaign.status === status);
        const limit = Number(c.req.query('limit') ?? campaigns.length);
        return c.json(campaigns.slice(0, Number.isFinite(limit) ? limit : campaigns.length));
      });

      app.post('/campaigns', async (c) => {
        const next = state(store, provider);
        const body = await c.req.json().catch(() => ({}));
        if (!body.name) return c.json({ message: 'name is required' }, 400);
        const campaign = {
          id: `${provider}_campaign_${next.nextCampaignId++}`,
          name: body.name,
          status: body.status ?? 'active',
          budget: Number(body.budget ?? 0),
          platform: provider,
          placement: body.placement,
          objective: body.objective ?? 'conversions',
          createdAt: now(),
          updatedAt: now(),
        };
        next.campaigns.push(campaign);
        saveState(store, provider, next);
        return c.json(campaign, 201);
      });

      app.get('/campaigns/:id', (c) => {
        const campaign = state(store, provider).campaigns.find((item) => item.id === c.req.param('id'));
        if (!campaign) return c.json({ message: 'Campaign not found' }, 404);
        return c.json(campaign);
      });

      app.patch('/campaigns/:id', async (c) => {
        const next = state(store, provider);
        const campaign = next.campaigns.find((item) => item.id === c.req.param('id'));
        if (!campaign) return c.json({ message: 'Campaign not found' }, 404);
        const body = await c.req.json().catch(() => ({}));
        Object.assign(campaign, body, { updatedAt: now() });
        saveState(store, provider, next);
        return c.json(campaign);
      });

      app.delete('/campaigns/:id', (c) => {
        const next = state(store, provider);
        const campaign = next.campaigns.find((item) => item.id === c.req.param('id'));
        if (!campaign) return c.json({ message: 'Campaign not found' }, 404);
        campaign.status = 'archived';
        campaign.updatedAt = now();
        saveState(store, provider, next);
        return c.json({ id: campaign.id, deleted: true });
      });

      app.post('/reports', async (c) => c.json(metricReport(provider, await c.req.json().catch(() => ({})))));

      app.get('/inspect/hits', (c) => c.json(store.getData?.(`${provider}:hits`) ?? []));

      function hit(surface) {
        const key = `${provider}:hits`;
        const hits = store.getData?.(key) ?? [];
        hits.push({ surface, at: now() });
        store.setData?.(key, hits);
      }

      function getMetaCampaign(c) {
        hit('meta.campaign.get');
        const campaign = state(store, provider).campaigns.find((item) => item.id === c.req.param('campaignId'));
        if (!campaign) return c.json({ error: { message: 'Unsupported get request' } }, 404);
        return c.json(toMetaCampaign(campaign));
      }

      app.get('/:graphVersion/me/adaccounts', (c) => {
        hit('meta.adaccount.list');
        return c.json({
          data: [{
            id: 'act_123456',
            account_id: '123456',
            name: `${label} Emulator Account`,
            account_status: 1,
            currency: 'USD',
            timezone_name: 'Etc/UTC',
          }],
        });
      });

      app.get('/:graphVersion/:accountId/campaigns', (c) => {
        hit('meta.campaign.list');
        return c.json({ data: state(store, provider).campaigns.map(toMetaCampaign) });
      });

      app.post('/:graphVersion/:accountId/campaigns', async (c) => {
        hit('meta.campaign.create');
        const next = state(store, provider);
        const body = await metaBody(c);
        const campaign = {
          id: `${provider}_campaign_${next.nextCampaignId++}`,
          name: body.name ?? `${label} Campaign`,
          status: body.status === 'PAUSED' ? 'paused' : 'active',
          budget: Number(body.daily_budget ?? body.budget ?? 0) / (body.daily_budget ? 100 : 1),
          platform: provider,
          objective: String(body.objective ?? 'CONVERSIONS').toLowerCase(),
          createdAt: now(),
          updatedAt: now(),
        };
        next.campaigns.push(campaign);
        saveState(store, provider, next);
        return c.json(toMetaCampaign(campaign), 201);
      });

      app.get('/v18.0/:campaignId', getMetaCampaign);
      app.get('/v20.0/:campaignId', getMetaCampaign);
      app.get('/v25.0/:campaignId', getMetaCampaign);
      app.get('/:graphVersion/:campaignId', getMetaCampaign);

      app.post('/:graphVersion/:campaignId', async (c) => {
        hit('meta.campaign.update');
        const next = state(store, provider);
        const campaign = next.campaigns.find((item) => item.id === c.req.param('campaignId'));
        if (!campaign) return c.json({ error: { message: 'Unsupported post request' } }, 404);
        const body = await metaBody(c);
        if (body.name) campaign.name = body.name;
        if (body.daily_budget !== undefined) campaign.budget = Number(body.daily_budget) / 100;
        if (body.status) campaign.status = body.status === 'PAUSED' ? 'paused' : body.status === 'ARCHIVED' ? 'archived' : 'active';
        campaign.updatedAt = now();
        saveState(store, provider, next);
        return c.json({ success: true });
      });

      app.get('/:graphVersion/:accountId/insights', (c) => {
        hit('meta.report');
        return c.json({ data: [{ spend: '321.45', impressions: '12000', clicks: '840', ctr: '7', cpc: '0.3827', actions: [{ action_type: 'conversion', value: '42' }] }] });
      });

      app.get('/v1/adaccounts/:accountId/campaigns', (c) => {
        hit('snap.campaign.list');
        return c.json({ request_status: 'SUCCESS', campaigns: state(store, provider).campaigns.map(toSnapCampaign) });
      });

      app.post('/v1/adaccounts/:accountId/campaigns', async (c) => {
        hit('snap.campaign.create');
        const next = state(store, provider);
        const body = await c.req.json().catch(() => ({}));
        const src = body.campaigns?.[0] ?? body;
        const campaign = {
          id: `${provider}_campaign_${next.nextCampaignId++}`,
          name: src.name ?? `${label} Campaign`,
          status: String(src.status ?? 'ACTIVE').toLowerCase(),
          budget: Number(src.daily_budget_micro ?? src.budget ?? 0) / (src.daily_budget_micro ? 1000000 : 1),
          platform: provider,
          objective: src.objective ?? 'conversions',
          createdAt: now(),
          updatedAt: now(),
        };
        next.campaigns.push(campaign);
        saveState(store, provider, next);
        return c.json({ request_status: 'SUCCESS', campaigns: [toSnapCampaign(campaign)] }, 201);
      });

      app.get('/v1/campaigns/:campaignId', (c) => {
        hit('snap.campaign.get');
        const campaign = state(store, provider).campaigns.find((item) => item.id === c.req.param('campaignId'));
        if (!campaign) return c.json({ request_status: 'ERROR', message: 'Not found' }, 404);
        return c.json({ request_status: 'SUCCESS', campaigns: [toSnapCampaign(campaign)] });
      });

      app.put('/v1/campaigns/:campaignId', async (c) => {
        hit('snap.campaign.update');
        const next = state(store, provider);
        const campaign = next.campaigns.find((item) => item.id === c.req.param('campaignId'));
        if (!campaign) return c.json({ request_status: 'ERROR', message: 'Not found' }, 404);
        const body = await c.req.json().catch(() => ({}));
        const src = body.campaigns?.[0] ?? body;
        if (src.name) campaign.name = src.name;
        if (src.daily_budget_micro !== undefined) campaign.budget = Number(src.daily_budget_micro) / 1000000;
        if (src.status) campaign.status = String(src.status).toLowerCase();
        campaign.updatedAt = now();
        saveState(store, provider, next);
        return c.json({ request_status: 'SUCCESS', campaigns: [toSnapCampaign(campaign)] });
      });

      app.delete('/v1/campaigns/:campaignId', (c) => {
        hit('snap.campaign.delete');
        const next = state(store, provider);
        const campaign = next.campaigns.find((item) => item.id === c.req.param('campaignId'));
        if (!campaign) return c.json({ request_status: 'ERROR', message: 'Not found' }, 404);
        campaign.status = 'archived';
        campaign.updatedAt = now();
        saveState(store, provider, next);
        return c.json({ request_status: 'SUCCESS' });
      });

      app.get('/v1/adaccounts/:accountId/stats', (c) => {
        hit('snap.report');
        return c.json({ request_status: 'SUCCESS', timeseries_stats: [{ stats: { spend: 321450000, impressions: 12000, swipes: 840, conversions: 42 } }] });
      });

      app.get('/applovin/campaigns', (c) => {
        hit('applovin.campaign.list');
        return c.json({ campaigns: state(store, provider).campaigns.map(toAppLovinCampaign) });
      });

      app.post('/applovin/campaigns', async (c) => {
        hit('applovin.campaign.create');
        const next = state(store, provider);
        const body = await c.req.json().catch(() => ({}));
        const campaign = {
          id: `${provider}_campaign_${next.nextCampaignId++}`,
          name: body.name ?? `${label} Campaign`,
          status: body.status ?? 'active',
          budget: Number(body.daily_budget ?? body.budget ?? 0),
          platform: provider,
          objective: body.goal ?? body.objective ?? 'conversions',
          createdAt: now(),
          updatedAt: now(),
        };
        next.campaigns.push(campaign);
        saveState(store, provider, next);
        return c.json(toAppLovinCampaign(campaign), 201);
      });

      app.get('/applovin/campaigns/:campaignId', (c) => {
        hit('applovin.campaign.get');
        const campaign = state(store, provider).campaigns.find((item) => item.id === c.req.param('campaignId'));
        if (!campaign) return c.json({ error: 'not_found' }, 404);
        return c.json(toAppLovinCampaign(campaign));
      });

      app.patch('/applovin/campaigns/:campaignId', async (c) => {
        hit('applovin.campaign.update');
        const next = state(store, provider);
        const campaign = next.campaigns.find((item) => item.id === c.req.param('campaignId'));
        if (!campaign) return c.json({ error: 'not_found' }, 404);
        const body = await c.req.json().catch(() => ({}));
        if (body.name) campaign.name = body.name;
        if (body.daily_budget !== undefined || body.budget !== undefined) campaign.budget = Number(body.daily_budget ?? body.budget);
        if (body.status) campaign.status = body.status;
        campaign.updatedAt = now();
        saveState(store, provider, next);
        return c.json(toAppLovinCampaign(campaign));
      });

      app.delete('/applovin/campaigns/:campaignId', (c) => {
        hit('applovin.campaign.delete');
        const next = state(store, provider);
        const campaign = next.campaigns.find((item) => item.id === c.req.param('campaignId'));
        if (!campaign) return c.json({ error: 'not_found' }, 404);
        campaign.status = 'archived';
        campaign.updatedAt = now();
        saveState(store, provider, next);
        return c.json({ deleted: true });
      });

      app.get('/applovin/reports/campaigns', (c) => {
        hit('applovin.report');
        return c.json({ results: [{ spend: 321.45, impressions: 12000, clicks: 840, conversions: 42 }] });
      });

      app.get('/campaign/get', (c) => {
        hit('tiktok.campaign.list');
        const campaigns = state(store, provider).campaigns;
        const ids = c.req.query('campaign_ids');
        let list = campaigns;
        if (ids) {
          const wanted = new Set(JSON.parse(ids));
          list = campaigns.filter((campaign) => wanted.has(campaign.id));
        }
        return c.json({ code: 0, message: 'OK', data: { list: list.map(toTikTokCampaign), page_info: { total_count: list.length, page_size: list.length, page_number: 1 } } });
      });

      app.post('/campaign/create', async (c) => {
        hit('tiktok.campaign.create');
        const next = state(store, provider);
        const body = await c.req.json().catch(() => ({}));
        const campaign = {
          id: `${provider}_campaign_${next.nextCampaignId++}`,
          name: body.campaign_name ?? body.name ?? `${label} Campaign`,
          status: 'active',
          budget: Number(body.budget ?? 0),
          platform: provider,
          objective: String(body.objective_type ?? body.objective ?? 'conversions').toLowerCase(),
          createdAt: now(),
          updatedAt: now(),
        };
        next.campaigns.push(campaign);
        saveState(store, provider, next);
        return c.json({ code: 0, message: 'OK', data: { campaign_id: campaign.id } });
      });

      app.post('/campaign/update', async (c) => {
        hit('tiktok.campaign.update');
        const next = state(store, provider);
        const body = await c.req.json().catch(() => ({}));
        const campaign = next.campaigns.find((item) => item.id === body.campaign_id);
        if (!campaign) return c.json({ code: 404, message: 'Campaign not found' }, 404);
        if (body.campaign_name) campaign.name = body.campaign_name;
        if (body.budget !== undefined) campaign.budget = Number(body.budget);
        if (body.campaign_status) campaign.status = body.campaign_status === 'DISABLE' || body.campaign_status === 'PAUSED' ? 'paused' : 'active';
        campaign.updatedAt = now();
        saveState(store, provider, next);
        return c.json({ code: 0, message: 'OK', data: { campaign_id: campaign.id } });
      });

      app.post('/campaign/status/update', async (c) => {
        hit('tiktok.campaign.status');
        const next = state(store, provider);
        const body = await c.req.json().catch(() => ({}));
        const ids = new Set(body.campaign_ids ?? []);
        for (const campaign of next.campaigns.filter((item) => ids.has(item.id))) {
          campaign.status = body.operation_status === 'PAUSE' ? 'paused' : body.operation_status === 'DELETE' ? 'archived' : 'active';
          campaign.updatedAt = now();
        }
        saveState(store, provider, next);
        return c.json({ code: 0, message: 'OK', data: {} });
      });

      app.post('/report/campaign/get', async (c) => {
        hit('tiktok.report');
        const body = await c.req.json().catch(() => ({}));
        return c.json({
          code: 0,
          message: 'OK',
          data: {
            list: [{ campaign_id: body.campaign_ids?.[0], spend: 321.45, impressions: 12000, clicks: 840, ctr: 0.07, cpc: 0.3827, conversions: 42 }],
            page_info: { total_count: 1, page_size: 100, page_number: 1 },
          },
        });
      });

      function googleSearchResults(c, query) {
        hit('google.search');
        const customerId = c.req.param('customerId');
        const idMatch = query.match(/campaign\.id\s*=\s*([A-Za-z0-9_-]+)/);
        let campaigns = state(store, provider).campaigns;
        if (idMatch) campaigns = campaigns.filter((campaign) => campaign.id === idMatch[1]);
        return campaigns.map((campaign) => toGoogleCampaign(campaign, customerId));
      }

      app.get('/v17/customers/:customerId/googleAds:search', (c) => {
        return c.json({ results: googleSearchResults(c, c.req.query('query') ?? '') });
      });

      app.post('/v23/customers/:customerId/googleAds:searchStream', async (c) => {
        const body = await c.req.json().catch(() => ({}));
        return c.json([{ results: googleSearchResults(c, String(body.query ?? '')) }]);
      });

      app.get('/v23/customers:listAccessibleCustomers', (c) => {
        hit('google.customers.list');
        return c.json({ resourceNames: ['customers/1234567890'] });
      });

      app.post('/v17/customers/:customerId/campaigns:mutate', async (c) => {
        hit('google.campaign.mutate');
        const next = state(store, provider);
        const customerId = c.req.param('customerId');
        const body = await c.req.json().catch(() => ({}));
        const ops = body.operations ?? [body.operation].filter(Boolean);
        const results = [];
        for (const op of ops) {
          if (op.create) {
            const campaign = {
              id: `${provider}_campaign_${next.nextCampaignId++}`,
              name: op.create.name ?? `${label} Campaign`,
              status: op.create.status === 'PAUSED' ? 'paused' : 'active',
              budget: 0,
              platform: provider,
              objective: 'conversions',
              createdAt: now(),
              updatedAt: now(),
            };
            next.campaigns.push(campaign);
            results.push({ resourceName: `customers/${customerId}/campaigns/${campaign.id}` });
          }
          if (op.update) {
            const id = String(op.update.resourceName ?? '').split('/').pop();
            const campaign = next.campaigns.find((item) => item.id === id);
            if (campaign) {
              if (op.update.name) campaign.name = op.update.name;
              if (op.update.status) campaign.status = op.update.status === 'PAUSED' ? 'paused' : 'active';
              campaign.updatedAt = now();
              results.push({ resourceName: `customers/${customerId}/campaigns/${campaign.id}` });
            }
          }
          if (op.remove) {
            const id = String(op.remove).split('/').pop();
            const campaign = next.campaigns.find((item) => item.id === id);
            if (campaign) {
              campaign.status = 'archived';
              campaign.updatedAt = now();
              results.push({ resourceName: `customers/${customerId}/campaigns/${campaign.id}` });
            }
          }
        }
        saveState(store, provider, next);
        return c.json({ results });
      });

      app.get('/inspect/contract', (c) => c.json(contract));
      app.get('/inspect/state', (c) => c.json(state(store, provider)));
      app.post('/inspect/reset', (c) => {
        saveState(store, provider, initialState(provider));
        return c.json({ ok: true });
      });
    },
  };

  const initConfig = {
    [provider]: {
      apiBaseUrl: 'same emulator origin',
      campaigns: [{ id: `${provider}_campaign_seed`, name: `${label} Seed Campaign`, status: 'active', budget: 100 }],
    },
  };

  return {
    plugin,
    contract,
    label: `${label} API emulator`,
    endpoints: 'campaign create/list/get/update/delete, reports, inspect',
    capabilities: contract.scope,
    initConfig,
    seedFromConfig(store, baseUrl, config) {
      saveState(store, provider, initialState(provider, config));
    },
  };
}
