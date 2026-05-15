import { branch as createPgBranch, deleteBranch, diffBranch, execSql, exportBranch, promoteBranch, start as startPostgres } from '../../../@supabase/local-postgres/branch.mjs';

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
function physicalBranchDatabase(branchId) {
  return `neon_${branchId.replaceAll('-', '_').replaceAll('.', '_')}`.slice(0, 63);
}
function connectionUri(database) {
  return `postgres://postgres:postgres@127.0.0.1:55432/${database}`;
}
function branchRecord(next, branchId) {
  return next.branches.find((branch) => branch.id === branchId || branch.name === branchId);
}
function serializeBranch(branch) {
  return {
    ...branch,
    connection_uri: connectionUri(branch.database_name),
  };
}

export function registerRoutes(app, store, contract) {
  app.post('/projects', async (c) => { const next = state(store); const input = await body(c); const project = { id: id('project'), name: input.project?.name ?? input.name ?? 'emulator-project', region_id: input.project?.region_id ?? 'aws-us-east-1', created_at: now() }; next.projects.push(project); save(store, next); return c.json({ project }, 201); });
  app.get('/projects', (c) => c.json({ projects: state(store).projects }));
  app.post('/projects/:projectId/branches', async (c) => { const next = state(store); const input = await body(c); const branchId = id('branch'); const parent = input.branch?.parent_id ?? input.parent_id; const parentBranch = parent ? branchRecord(next, parent) : null; const source = parentBranch?.database_name ?? 'postgres'; const branch = { id: branchId, project_id: c.req.param('projectId'), name: input.branch?.name ?? input.name ?? 'main', parent_id: parentBranch?.id ?? null, database_name: physicalBranchDatabase(branchId), created_at: now() }; await startPostgres(); await createPgBranch(source, branch.database_name); next.branches.push(branch); save(store, next); return c.json({ branch: serializeBranch(branch) }, 201); });
  app.get('/projects/:projectId/branches', (c) => c.json({ branches: state(store).branches.filter((b) => b.project_id === c.req.param('projectId')).map(serializeBranch) }));
  app.post('/projects/:projectId/branches/:branchId/databases', async (c) => { const next = state(store); const input = await body(c); const database = { id: id('db'), project_id: c.req.param('projectId'), branch_id: c.req.param('branchId'), name: input.database?.name ?? input.name ?? 'main', owner_name: input.database?.owner_name ?? 'neondb_owner' }; next.databases.push(database); save(store, next); return c.json({ database }, 201); });
  app.post('/projects/:projectId/branches/:branchId/roles', async (c) => { const next = state(store); const role = { name: (await body(c)).role?.name ?? 'neondb_owner', password: 'neon-emulator-password', branch_id: c.req.param('branchId') }; next.roles.push(role); save(store, next); return c.json({ role }, 201); });
  app.get('/projects/:projectId/connection_uri', (c) => { const next = state(store); const branchId = c.req.query?.('branch_id') ?? c.req.query?.('branchId'); const databaseName = c.req.query?.('database_name') ?? c.req.query?.('databaseName'); const branch = branchId ? branchRecord(next, branchId) : next.branches.find((item) => item.project_id === c.req.param('projectId')); const database = databaseName ?? branch?.database_name ?? 'postgres'; return c.json({ uri: connectionUri(database) }); });
  app.post('/_emu/neon/branches/:branchId/exec', async (c) => { const next = state(store); const target = branchRecord(next, c.req.param('branchId')); const input = await body(c); if (!target) return c.json({ error: 'not_found' }, 404); return c.json({ stdout: await execSql(target.database_name, input.sql ?? '') }); });
  app.post('/_emu/db/neon/databases', async (c) => {
    const next = state(store);
    const input = await body(c);
    const project = { id: input.id ?? id('project'), name: input.name ?? 'emulator-project', region_id: input.region_id ?? 'aws-us-east-1', created_at: now() };
    next.projects.push(project);
    save(store, next);
    return c.json(project, 201);
  });
  app.get('/_emu/db/neon/databases', (c) => c.json({ data: state(store).projects }));
  app.post('/_emu/db/neon/databases/:id/branches', async (c) => {
    const next = state(store);
    const input = await body(c);
    const branchId = id('branch');
    const parent = input.parent ?? input.parent_id;
    const parentBranch = parent ? branchRecord(next, parent) : null;
    const source = parentBranch?.database_name ?? 'postgres';
    const branch = { id: branchId, project_id: c.req.param('id'), name: input.name ?? input.branch ?? 'main', parent_id: parentBranch?.id ?? null, database_name: physicalBranchDatabase(branchId), created_at: now() };
    await startPostgres();
    await createPgBranch(source, branch.database_name);
    next.branches.push(branch);
    save(store, next);
    return c.json(serializeBranch(branch), 201);
  });
  app.get('/_emu/db/neon/databases/:id/branches', (c) => c.json({ data: state(store).branches.filter((branch) => branch.project_id === c.req.param('id')).map(serializeBranch) }));
  app.delete?.('/_emu/db/neon/databases/:id/branches/:branch', async (c) => { const next = state(store); const target = branchRecord(next, c.req.param('branch')); if (!target) return c.json({ error: 'not_found' }, 404); await deleteBranch(target.database_name); next.branches = next.branches.filter((branch) => branch.id !== target.id); save(store, next); return c.json({ ok: true }); });
  app.post('/_emu/db/neon/databases/:id/branches/:branch/exec', async (c) => { const next = state(store); const target = branchRecord(next, c.req.param('branch')); const input = await body(c); if (!target) return c.json({ error: 'not_found' }, 404); return c.json({ stdout: await execSql(target.database_name, input.sql ?? '') }); });
  app.get('/_emu/db/neon/databases/:id/branches/:branch/export', async (c) => { const target = branchRecord(state(store), c.req.param('branch')); if (!target) return c.json({ error: 'not_found' }, 404); return c.json({ sql: await exportBranch(target.database_name) }); });
  app.get('/_emu/db/neon/databases/:id/branches/:branch/diff', async (c) => { const target = branchRecord(state(store), c.req.param('branch')); if (!target) return c.json({ error: 'not_found' }, 404); return c.json(await diffBranch(target.database_name, 'postgres', 'neon')); });
  app.post('/_emu/db/neon/databases/:id/branches/:branch/promote', async (c) => { const target = branchRecord(state(store), c.req.param('branch')); if (!target) return c.json({ error: 'not_found' }, 404); await promoteBranch(target.database_name, 'postgres'); return c.json({ ok: true }); });
  app.get('/inspect/contract', (c) => c.json(contract));
  app.get('/inspect/state', (c) => c.json(state(store)));
  app.post('/inspect/reset', (c) => { store.setData?.('neon:state', null); state(store); return c.json({ ok: true }); });
}
