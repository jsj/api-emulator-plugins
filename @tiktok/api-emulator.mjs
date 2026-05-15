import { createAdPlatformPlugin } from '../scripts/ad-platform-plugin-factory.mjs';

const mod = createAdPlatformPlugin({
  provider: 'tiktok',
  label: 'TikTok Ads',
  docs: 'https://business-api.tiktok.com/portal/docs',
  source: 'TikTok Business API OpenAPI-compatible surface',
});

function now() {
  return new Date().toISOString();
}

function state(store) {
  const current = store.getData?.('tiktok:ads-state');
  if (current) return current;
  const next = {
    campaigns: [{ id: 'tiktok_campaign_seed', name: 'TikTok Ads Seed Campaign', status: 'active', budget: 100, platform: 'tiktok', objective: 'conversions', createdAt: now(), updatedAt: now() }],
    ads: [],
    nextCampaignId: 2,
    nextAdId: 1,
  };
  store.setData?.('tiktok:ads-state', next);
  return next;
}

function hit(store, surface) {
  const hits = store.getData?.('tiktok:hits') ?? [];
  hits.push({ surface, at: now() });
  store.setData?.('tiktok:hits', hits);
}

function pageInfo(list, page = 1, pageSize = list.length || 100) {
  return {
    page,
    page_size: pageSize,
    total_number: list.length,
    total_page: Math.max(1, Math.ceil(list.length / pageSize)),
    total_count: list.length,
    page_number: page,
  };
}

function ok(data) {
  return { code: 0, message: 'OK', request_id: 'tiktok_emulator_request', data };
}

function parseJsonQuery(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toCampaign(campaign) {
  return {
    campaign_id: campaign.id,
    campaign_name: campaign.name,
    advertiser_id: '7000000000000',
    objective_type: String(campaign.objective ?? 'conversions').toUpperCase(),
    status: campaign.status === 'paused' ? 'CAMPAIGN_STATUS_DISABLE' : campaign.status === 'archived' ? 'CAMPAIGN_STATUS_DELETE' : 'CAMPAIGN_STATUS_ENABLE',
    primary_status: campaign.status === 'paused' ? 'CAMPAIGN_STATUS_DISABLE' : 'CAMPAIGN_STATUS_ENABLE',
    budget: campaign.budget,
    created_at: Math.floor(new Date(campaign.createdAt).getTime() / 1000),
    updated_at: Math.floor(new Date(campaign.updatedAt).getTime() / 1000),
  };
}

function adgroups(campaigns) {
  return campaigns.map((campaign, index) => ({
    adgroup_id: `tiktok_adgroup_${index + 1}`,
    adgroup_name: `${campaign.name} Ad Group`,
    campaign_id: campaign.id,
    advertiser_id: '7000000000000',
    status: 'ADGROUP_STATUS_ENABLE',
    primary_status: 'ADGROUP_STATUS_DELIVERY_OK',
    budget: Math.max(1, Math.round(campaign.budget / 2)),
  }));
}

function ads(campaigns) {
  return campaigns.map((campaign, index) => ({
    ad_id: `tiktok_ad_${index + 1}`,
    ad_name: `${campaign.name} Ad`,
    adgroup_id: `tiktok_adgroup_${index + 1}`,
    campaign_id: campaign.id,
    advertiser_id: '7000000000000',
    status: 'AD_STATUS_ENABLE',
    primary_status: 'AD_STATUS_DELIVERY_OK',
    image_ids: ['tiktok_image_seed'],
    video_id: 'tiktok_video_seed',
  }));
}

function registerTikTokCliRoutes(app, store) {
  const add = (method, path, handler) => {
    app[method](path, handler);
    app[method](`/open_api/v1.3${path}`, handler);
  };

  add('get', '/advertiser/info/', (c) => {
    hit(store, 'tiktok.advertiser.info');
    const ids = parseJsonQuery(c.req.query('advertiser_ids'), ['7000000000000']);
    return c.json(ok({
      list: ids.map((id) => ({
        advertiser_id: id,
        name: 'TikTok Ads Emulator Account',
        currency: 'USD',
        timezone: 'Etc/UTC',
        status: 'STATUS_ENABLE',
      })),
    }));
  });

  add('get', '/campaign/get/', (c) => {
    hit(store, 'tiktok.campaign.cli.list');
    let list = state(store).campaigns;
    const filtering = parseJsonQuery(c.req.query('filtering'), {});
    if (filtering.campaign_ids) {
      const wanted = new Set(filtering.campaign_ids);
      list = list.filter((campaign) => wanted.has(campaign.id));
    }
    if (filtering.primary_status) {
      const enabled = filtering.primary_status === 'CAMPAIGN_STATUS_ENABLE';
      list = list.filter((campaign) => enabled ? campaign.status === 'active' : campaign.status !== 'active');
    }
    const page = Number(c.req.query('page') ?? 1);
    const pageSize = Number(c.req.query('page_size') ?? (list.length || 100));
    return c.json(ok({ list: list.map(toCampaign), page_info: pageInfo(list, page, pageSize) }));
  });

  add('get', '/adgroup/get/', (c) => {
    hit(store, 'tiktok.adgroup.list');
    let list = adgroups(state(store).campaigns);
    const filtering = parseJsonQuery(c.req.query('filtering'), {});
    if (filtering.campaign_ids) {
      const wanted = new Set(filtering.campaign_ids);
      list = list.filter((adgroup) => wanted.has(adgroup.campaign_id));
    }
    return c.json(ok({ list, page_info: pageInfo(list, Number(c.req.query('page') ?? 1), Number(c.req.query('page_size') ?? (list.length || 100))) }));
  });

  add('get', '/ad/get/', (c) => {
    hit(store, 'tiktok.ad.list');
    let list = ads(state(store).campaigns);
    const filtering = parseJsonQuery(c.req.query('filtering'), {});
    if (filtering.campaign_ids) {
      const wanted = new Set(filtering.campaign_ids);
      list = list.filter((ad) => wanted.has(ad.campaign_id));
    }
    if (filtering.adgroup_ids) {
      const wanted = new Set(filtering.adgroup_ids);
      list = list.filter((ad) => wanted.has(ad.adgroup_id));
    }
    if (filtering.ad_ids) {
      const wanted = new Set(filtering.ad_ids);
      list = list.filter((ad) => wanted.has(ad.ad_id));
    }
    return c.json(ok({ list, page_info: pageInfo(list, Number(c.req.query('page') ?? 1), Number(c.req.query('page_size') ?? (list.length || 100))) }));
  });

  add('get', '/file/image/ad/info/', (c) => {
    hit(store, 'tiktok.image.list');
    const list = [{ image_id: 'tiktok_image_seed', file_name: 'emulator-image.png', width: 1200, height: 628, signature: 'image_seed' }];
    return c.json(ok({ list, page_info: pageInfo(list) }));
  });

  add('get', '/file/video/ad/info/', (c) => {
    hit(store, 'tiktok.video.list');
    const list = [{ video_id: 'tiktok_video_seed', file_name: 'emulator-video.mp4', duration: 15, width: 1080, height: 1920 }];
    return c.json(ok({ list, page_info: pageInfo(list) }));
  });

  add('get', '/dmp/custom_audience/list/', (c) => {
    hit(store, 'tiktok.audience.list');
    const list = [{ audience_id: 'tiktok_audience_seed', audience_name: 'Emulator Purchasers', audience_type: 'CUSTOM_AUDIENCE', status: 'AUDIENCE_STATUS_READY' }];
    return c.json(ok({ list, page_info: pageInfo(list) }));
  });

  add('get', '/pixel/list/', (c) => {
    hit(store, 'tiktok.pixel.list');
    let list = [{ pixel_code: 'tiktok_pixel_seed', pixel_name: 'Emulator Pixel', status: 'ENABLE' }];
    const pixelCode = c.req.query('pixel_code');
    if (pixelCode) list = list.filter((pixel) => pixel.pixel_code === pixelCode);
    return c.json(ok({ list, page_info: pageInfo(list) }));
  });

  add('get', '/report/integrated/get/', (c) => {
    hit(store, 'tiktok.report.integrated');
    const dimensions = parseJsonQuery(c.req.query('dimensions'), ['campaign_id', 'stat_time_day']);
    const metrics = parseJsonQuery(c.req.query('metrics'), ['spend', 'impressions', 'clicks', 'ctr', 'cpc']);
    const campaign = state(store).campaigns[0];
    const row = {
      dimensions: Object.fromEntries(dimensions.map((dimension) => [dimension, dimension === 'campaign_id' ? campaign.id : '2026-05-15'])),
      metrics: Object.fromEntries(metrics.map((metric) => [metric, metric === 'spend' ? '321.45' : metric === 'impressions' ? '12000' : metric === 'clicks' ? '840' : metric === 'ctr' ? '0.07' : '42'])),
    };
    return c.json(ok({ list: [row], page_info: pageInfo([row], Number(c.req.query('page') ?? 1), Number(c.req.query('page_size') ?? 100)) }));
  });

  add('post', '/report/task/create/', async (c) => {
    hit(store, 'tiktok.report.task.create');
    const body = await c.req.json().catch(() => ({}));
    return c.json(ok({ task_id: `tiktok_report_task_${body.advertiser_id ?? 'emulator'}`, status: 'SUCCESS' }));
  });

  add('get', '/report/task/check/', (c) => {
    hit(store, 'tiktok.report.task.check');
    return c.json(ok({ task_id: c.req.query('task_id') ?? 'tiktok_report_task_emulator', status: 'SUCCESS', download_url: 'https://example.com/tiktok-emulator-report.csv' }));
  });
}

export const contract = {
  ...mod.contract,
  scope: [...mod.contract.scope, 'advertisers', 'adgroups', 'creatives', 'audiences', 'pixels', 'async_reports'],
};
export const label = mod.label;
export const endpoints = `${mod.endpoints}, TikTok CLI advertiser/adgroup/ad/creative/audience/pixel/report endpoints`;
export const capabilities = contract.scope;
export const { initConfig, seedFromConfig } = mod;
export const plugin = {
  ...mod.plugin,
  register(app, store) {
    mod.plugin.register(app, store);
    registerTikTokCliRoutes(app, store);
  },
};
export default plugin;
