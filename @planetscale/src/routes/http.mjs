function now() { return new Date().toISOString(); }
function id(prefix) { return prefix + '_' + crypto.randomUUID().replaceAll('-', '').slice(0, 20); }
function state(store) {
  const key = 'planetscale:state';
  const existing = store.getData?.(key);
  if (existing) return existing;
  const initial = { organizations: [], databases: [], branches: [], passwords: [], deployRequests: [] };
  store.setData?.(key, initial);
  return initial;
}
function save(store, next) { store.setData?.('planetscale:state', next); }
async function body(c) {
  if (c.req.parseBody) return c.req.parseBody().catch(() => ({}));
  return c.req.json().catch(() => ({}));
}
function list(items) { return { data: items, pagination: { total: items.length } }; }

export function registerRoutes(app, store, contract) {
  app.get('/organizations', (c) => c.json(list(state(store).organizations)));
  app.post('/organizations/:org/databases', async (c) => { const next = state(store); const input = await body(c); if (!next.organizations.find((o) => o.name === c.req.param('org'))) next.organizations.push({ name: c.req.param('org') }); const db = { id: id('db'), organization: c.req.param('org'), name: input.name ?? 'emulator-db', created_at: now() }; next.databases.push(db); save(store, next); return c.json(db, 201); });
  app.get('/organizations/:org/databases', (c) => c.json(list(state(store).databases.filter((d) => d.organization === c.req.param('org')))));
  app.post('/organizations/:org/databases/:database/branches', async (c) => { const next = state(store); const branch = { id: id('branch'), organization: c.req.param('org'), database: c.req.param('database'), name: (await body(c)).name ?? 'main', safe_migrations: true, created_at: now() }; next.branches.push(branch); save(store, next); return c.json(branch, 201); });
  app.get('/organizations/:org/databases/:database/branches', (c) => c.json(list(state(store).branches.filter((b) => b.database === c.req.param('database')))));
  app.post('/organizations/:org/databases/:database/branches/:branch/passwords', async (c) => { const next = state(store); const pass = { id: id('pwd'), name: (await body(c)).name ?? 'default', username: 'pscale', password: 'planetscale-emulator-password', branch: c.req.param('branch') }; next.passwords.push(pass); save(store, next); return c.json(pass, 201); });
  app.post('/organizations/:org/databases/:database/deploy-requests', async (c) => { const next = state(store); const dr = { id: id('dr'), database: c.req.param('database'), state: 'open', ...(await body(c)), created_at: now() }; next.deployRequests.push(dr); save(store, next); return c.json(dr, 201); });
  app.get('/inspect/contract', (c) => c.json(contract));
  app.get('/inspect/state', (c) => c.json(state(store)));
  app.post('/inspect/reset', (c) => { store.setData?.('planetscale:state', null); state(store); return c.json({ ok: true }); });
}
