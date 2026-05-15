function now() { return new Date().toISOString(); }
function id(prefix) { return prefix + '_' + crypto.randomUUID().replaceAll('-', '').slice(0, 20); }
function state(store) {
  const key = 'neon:state';
  const existing = store.getData?.(key);
  if (existing) return existing;
  const initial = { projects: [], branches: [], databases: [], roles: [] };
  store.setData?.(key, initial);
  return initial;
}
function save(store, next) { store.setData?.('neon:state', next); }
async function body(c) {
  if (c.req.parseBody) return c.req.parseBody().catch(() => ({}));
  return c.req.json().catch(() => ({}));
}
function list(items) { return { data: items, pagination: { total: items.length } }; }

export function registerRoutes(app, store, contract) {
  app.post('/projects', async (c) => { const next = state(store); const input = await body(c); const project = { id: id('project'), name: input.project?.name ?? input.name ?? 'emulator-project', region_id: input.project?.region_id ?? 'aws-us-east-1', created_at: now() }; next.projects.push(project); save(store, next); return c.json({ project }, 201); });
  app.get('/projects', (c) => c.json({ projects: state(store).projects }));
  app.post('/projects/:projectId/branches', async (c) => { const next = state(store); const input = await body(c); const branch = { id: id('branch'), project_id: c.req.param('projectId'), name: input.branch?.name ?? input.name ?? 'main', created_at: now() }; next.branches.push(branch); save(store, next); return c.json({ branch }, 201); });
  app.get('/projects/:projectId/branches', (c) => c.json({ branches: state(store).branches.filter((b) => b.project_id === c.req.param('projectId')) }));
  app.post('/projects/:projectId/branches/:branchId/databases', async (c) => { const next = state(store); const input = await body(c); const database = { id: id('db'), project_id: c.req.param('projectId'), branch_id: c.req.param('branchId'), name: input.database?.name ?? input.name ?? 'main', owner_name: input.database?.owner_name ?? 'neondb_owner' }; next.databases.push(database); save(store, next); return c.json({ database }, 201); });
  app.post('/projects/:projectId/branches/:branchId/roles', async (c) => { const next = state(store); const role = { name: (await body(c)).role?.name ?? 'neondb_owner', password: 'neon-emulator-password', branch_id: c.req.param('branchId') }; next.roles.push(role); save(store, next); return c.json({ role }, 201); });
  app.get('/projects/:projectId/connection_uri', (c) => c.json({ uri: 'postgres://neondb_owner:neon-emulator-password@localhost:5432/neondb' }));
  app.get('/inspect/contract', (c) => c.json(contract));
  app.get('/inspect/state', (c) => c.json(state(store)));
  app.post('/inspect/reset', (c) => { store.setData?.('neon:state', null); state(store); return c.json({ ok: true }); });
}
