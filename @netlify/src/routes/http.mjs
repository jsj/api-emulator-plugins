function now() { return new Date().toISOString(); }
function id(prefix) { return prefix + '_' + crypto.randomUUID().replaceAll('-', '').slice(0, 20); }
function state(store) {
  const key = 'netlify:state';
  const existing = store.getData?.(key);
  if (existing) return existing;
  const initial = { sites: [], deploys: [], functions: [], env: [] };
  store.setData?.(key, initial);
  return initial;
}
function save(store, next) { store.setData?.('netlify:state', next); }
async function body(c) {
  if (c.req.parseBody) return c.req.parseBody().catch(() => ({}));
  return c.req.json().catch(() => ({}));
}
function list(items) { return { data: items, pagination: { total: items.length } }; }

export function registerRoutes(app, store, contract) {
  app.post('/api/v1/sites', async (c) => { const next = state(store); const input = await body(c); const site = { id: id('site'), name: input.name ?? 'emulator-site', url: 'https://emulator.netlify.app', created_at: now() }; next.sites.push(site); save(store, next); return c.json(site, 201); });
  app.get('/api/v1/sites', (c) => c.json(state(store).sites));
  app.get('/api/v1/sites/:siteId', (c) => c.json(state(store).sites.find((s) => s.id === c.req.param('siteId')) ?? { error: 'not_found' }, state(store).sites.some((s) => s.id === c.req.param('siteId')) ? 200 : 404));
  app.post('/api/v1/sites/:siteId/deploys', async (c) => { const next = state(store); const deploy = { id: id('deploy'), site_id: c.req.param('siteId'), state: 'ready', deploy_url: 'https://deploy-preview.netlify.app', created_at: now(), input: await body(c) }; next.deploys.push(deploy); save(store, next); return c.json(deploy, 201); });
  app.get('/api/v1/sites/:siteId/deploys', (c) => c.json(state(store).deploys.filter((d) => d.site_id === c.req.param('siteId'))));
  app.post('/api/v1/sites/:siteId/functions', async (c) => { const next = state(store); const fn = { id: id('fn'), site_id: c.req.param('siteId'), ...(await body(c)), created_at: now() }; next.functions.push(fn); save(store, next); return c.json(fn, 201); });
  app.get('/inspect/contract', (c) => c.json(contract));
  app.get('/inspect/state', (c) => c.json(state(store)));
  app.post('/inspect/reset', (c) => { store.setData?.('netlify:state', null); state(store); return c.json({ ok: true }); });
}
