function now() { return new Date().toISOString(); }
function id(prefix) { return prefix + '_' + crypto.randomUUID().replaceAll('-', '').slice(0, 20); }
function state(store) {
  const key = 'browserbase:state';
  const existing = store.getData?.(key);
  if (existing) return existing;
  const initial = { projects: [], sessions: [], contexts: [] };
  store.setData?.(key, initial);
  return initial;
}
function save(store, next) { store.setData?.('browserbase:state', next); }
async function body(c) {
  if (c.req.parseBody) return c.req.parseBody().catch(() => ({}));
  return c.req.json().catch(() => ({}));
}
function list(items) { return { data: items, pagination: { total: items.length } }; }

export function registerRoutes(app, store, contract) {
  app.post('/v1/projects', async (c) => { const next = state(store); const project = { id: id('proj'), name: (await body(c)).name ?? 'Browserbase Project', createdAt: now() }; next.projects.push(project); save(store, next); return c.json(project, 201); });
  app.get('/v1/projects', (c) => c.json(state(store).projects));
  app.post('/v1/contexts', async (c) => { const next = state(store); const context = { id: id('ctx'), projectId: (await body(c)).projectId, createdAt: now() }; next.contexts.push(context); save(store, next); return c.json(context, 201); });
  app.get('/v1/contexts', (c) => c.json(state(store).contexts));
  app.post('/v1/sessions', async (c) => { const next = state(store); const input = await body(c); const session = { id: id('sess'), projectId: input.projectId, contextId: input.contextId, status: 'RUNNING', connectUrl: 'wss://browserbase.local/session', createdAt: now() }; next.sessions.push(session); save(store, next); return c.json(session, 201); });
  app.get('/v1/sessions', (c) => c.json(state(store).sessions));
  app.get('/v1/sessions/:sessionId', (c) => c.json(state(store).sessions.find((s) => s.id === c.req.param('sessionId')) ?? { error: 'not_found' }));
  app.get('/inspect/contract', (c) => c.json(contract));
  app.get('/inspect/state', (c) => c.json(state(store)));
  app.post('/inspect/reset', (c) => { store.setData?.('browserbase:state', null); state(store); return c.json({ ok: true }); });
}
