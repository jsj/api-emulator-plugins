function now() { return new Date().toISOString(); }
function id(prefix) { return prefix + '_' + crypto.randomUUID().replaceAll('-', '').slice(0, 20); }
function state(store) {
  const key = 'mixpanel:state';
  const existing = store.getData?.(key);
  if (existing) return existing;
  const initial = { events: [], profiles: {}, flags: {} };
  store.setData?.(key, initial);
  return initial;
}
function save(store, next) { store.setData?.('mixpanel:state', next); }
async function body(c) {
  if (c.req.parseBody) return c.req.parseBody().catch(() => ({}));
  return c.req.json().catch(() => ({}));
}
function list(items) { return { data: items, pagination: { total: items.length } }; }
function mpOk() { return '1'; }
export function registerRoutes(app, store, contract) {
  app.post('/track', async (c) => { const next = state(store); const input = await body(c); const events = Array.isArray(input) ? input : [input]; next.events.push(...events.map((e) => ({ event: e.event, properties: e.properties ?? {}, time: now() }))); save(store, next); return c.json({ status: 1, num_records_imported: events.length }); });
  app.post('/import', async (c) => { const next = state(store); const events = Array.isArray(await body(c)) ? await body(c) : [await body(c)]; next.events.push(...events); save(store, next); return c.json({ status: 1, num_records_imported: events.length }); });
  app.post('/engage', async (c) => { const next = state(store); const input = await body(c); const id = input.$distinct_id ?? input.distinct_id ?? id('profile'); next.profiles[id] = { ...(next.profiles[id] ?? {}), ...(input.$set ?? input.properties ?? {}) }; save(store, next); return c.json({ status: 1 }); });
  app.post('/decide', async (c) => c.json({ feature_flags: state(store).flags, variants: {} }));
  app.post('/control/flags/:key', async (c) => { const next = state(store); next.flags[c.req.param('key')] = (await body(c)).value ?? true; save(store, next); return c.json({ ok: true }); });
  app.get('/api/2.0/events/properties', (c) => c.json({ results: Object.keys(state(store).events[0]?.properties ?? {}) }));
  app.get('/inspect/contract', (c) => c.json(contract));
  app.get('/inspect/state', (c) => c.json(state(store)));
  app.post('/inspect/reset', (c) => { store.setData?.('mixpanel:state', null); state(store); return c.json({ ok: true }); });
}
