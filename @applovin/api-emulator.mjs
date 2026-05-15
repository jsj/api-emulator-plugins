import { createAdPlatformPlugin } from '../scripts/ad-platform-plugin-factory.mjs';

const mod = createAdPlatformPlugin({
  provider: 'applovin',
  label: 'AppLovin',
  docs: 'https://developers.applovin.com',
  source: 'AppLovin marketing API OpenAPI-compatible surface',
});

function now() {
  return new Date().toISOString();
}

function hit(store, surface) {
  const hits = store.getData?.('applovin:hits') ?? [];
  hits.push({ surface, at: now() });
  store.setData?.('applovin:hits', hits);
}

function reportRows(c) {
  const columns = String(c.req.query('columns') ?? 'day,campaign,impressions,clicks,conversions,cost').split(',').map((item) => item.trim()).filter(Boolean);
  const values = {
    day: c.req.query('start') ?? '2026-05-15',
    application: 'Emulator App',
    package_name: 'com.example.app',
    country: 'US',
    platform: 'ios',
    campaign: 'AppLovin Emulator Campaign',
    campaign_id_external: 'applovin_campaign_seed',
    impressions: '12000',
    clicks: '840',
    conversions: '42',
    cost: '321.45',
    revenue: '654.32',
    ctr: '0.07',
  };
  return [Object.fromEntries(columns.map((column) => [column, values[column] ?? 'emulator']))];
}

function registerAppLovinReportRoutes(app, store) {
  async function report(c) {
    hit(store, 'applovin.report.api');
    if (!c.req.query('api_key')) return c.json({ error: 'api_key is required' }, 401);
    const rows = reportRows(c);
    if (c.req.query('format') === 'csv') {
      const columns = Object.keys(rows[0]);
      return c.text(`${columns.join(',')}\n${columns.map((column) => rows[0][column]).join(',')}\n`);
    }
    return c.json({ results: rows });
  }

  app.get('/report', report);
  app.get('/maxReport', report);
}

export const contract = {
  ...mod.contract,
  scope: [...mod.contract.scope, 'reporting_api', 'max_report'],
};
export const label = mod.label;
export const endpoints = `${mod.endpoints}, AppLovin /report and /maxReport reporting API`;
export const capabilities = contract.scope;
export const { initConfig, seedFromConfig } = mod;
export const plugin = {
  ...mod.plugin,
  register(app, store) {
    mod.plugin.register(app, store);
    registerAppLovinReportRoutes(app, store);
  },
};
export default plugin;
