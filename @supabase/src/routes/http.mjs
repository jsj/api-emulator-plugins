import { branch, deleteBranch, diffBranch, execSql, listBranches, promoteBranch } from '../../local-postgres/branch.mjs';

function now() { return new Date().toISOString(); }
function id(prefix) { return prefix + '_' + crypto.randomUUID().replaceAll('-', '').slice(0, 20); }
function state(store) {
  const key = 'supabase:state';
  const existing = store.getData?.(key);
  if (existing) return existing;
  const initial = {
    users: [],
    sessions: [],
    buckets: [],
    objects: [],
    tables: {},
    postgres: {
      schemas: ['auth', 'storage', 'realtime', 'graphql_public', 'vault', 'extensions', 'public'],
      storageBucketsTable: 'storage.buckets',
      storageObjectsTable: 'storage.objects',
      requiredIntrospection: [
        'pg_catalog.pg_namespace',
        'pg_catalog.pg_class',
        'pg_catalog.pg_attribute',
        'pg_catalog.pg_index',
        'pg_catalog.pg_constraint',
        'pg_catalog.pg_policies',
        'pg_catalog.pg_proc',
        'pg_catalog.pg_trigger',
        'pg_catalog.pg_extension'
      ]
    }
  };
  store.setData?.(key, initial);
  return initial;
}
function save(store, next) { store.setData?.('supabase:state', next); }
async function body(c) {
  if (c.req.parseBody) return c.req.parseBody().catch(() => ({}));
  return c.req.json().catch(() => ({}));
}
function list(items) { return { data: items, pagination: { total: items.length } }; }
function publicUser(u) { return { id: u.id, email: u.email, aud: 'authenticated', role: 'authenticated', created_at: u.created_at, user_metadata: u.user_metadata ?? {} }; }
function objectMetadata(object) {
  return {
    id: object.id,
    bucket_id: object.bucket_id,
    name: object.name,
    owner: object.owner ?? null,
    metadata: object.metadata ?? { size: String(object.content?.length ?? 0) },
    created_at: object.created_at,
    updated_at: object.updated_at ?? object.created_at,
    last_accessed_at: object.last_accessed_at ?? object.created_at
  };
}
function bucketMetadata(bucket) {
  return {
    id: bucket.id,
    name: bucket.name,
    public: bucket.public,
    file_size_limit: bucket.file_size_limit ?? null,
    allowed_mime_types: bucket.allowed_mime_types ?? null,
    created_at: bucket.created_at,
    updated_at: bucket.updated_at ?? bucket.created_at
  };
}
function findObject(next, bucket, path) {
  return next.objects.find((object) => object.bucket_id === bucket && object.name === path);
}
function raw(c, value, status = 200) {
  if (c.body) return c.body(value, status);
  if (c.text) return c.text(String(value), status);
  return c.json(value, status);
}
export function registerRoutes(app, store, contract) {
  app.post('/auth/v1/signup', async (c) => { const next = state(store); const input = await body(c); const user = { id: id('user'), email: input.email, password: input.password, created_at: now(), user_metadata: input.data ?? {} }; next.users.push(user); const token = 'sb_' + crypto.randomUUID(); next.sessions.push({ access_token: token, user_id: user.id, created_at: now() }); save(store, next); return c.json({ access_token: token, token_type: 'bearer', user: publicUser(user) }); });
  app.post('/auth/v1/token', async (c) => { const next = state(store); const input = await body(c); const user = next.users.find((u) => u.email === input.email && (!u.password || u.password === input.password)); if (!user) return c.json({ error: 'invalid_grant' }, 400); const token = 'sb_' + crypto.randomUUID(); next.sessions.push({ access_token: token, user_id: user.id, created_at: now() }); save(store, next); return c.json({ access_token: token, token_type: 'bearer', user: publicUser(user) }); });
  app.get('/auth/v1/user', (c) => { const token = c.req.header?.('authorization')?.replace(/^Bearer\s+/i, ''); const session = state(store).sessions.find((s) => s.access_token === token); const user = state(store).users.find((u) => u.id === session?.user_id); return user ? c.json(publicUser(user)) : c.json({ error: 'invalid_token' }, 401); });
  app.get('/auth/v1/admin/users', (c) => c.json({ users: state(store).users.map(publicUser) }));
  app.post('/storage/v1/bucket', async (c) => { const next = state(store); const input = await body(c); const bucket = { id: input.id ?? input.name, name: input.name ?? input.id, public: Boolean(input.public), file_size_limit: input.file_size_limit ?? null, allowed_mime_types: input.allowed_mime_types ?? null, created_at: now(), updated_at: now() }; next.buckets.push(bucket); save(store, next); return c.json(bucketMetadata(bucket), 201); });
  app.get('/storage/v1/bucket', (c) => c.json(state(store).buckets.map(bucketMetadata)));
  app.get('/storage/v1/bucket/:bucket', (c) => { const bucket = state(store).buckets.find((b) => b.id === c.req.param('bucket') || b.name === c.req.param('bucket')); return bucket ? c.json(bucketMetadata(bucket)) : c.json({ error: 'not_found', message: 'Bucket not found' }, 404); });
  app.post('/storage/v1/object/:bucket/:path', async (c) => { const next = state(store); const input = await body(c); const content = input.content ?? input.body ?? ''; const obj = { id: id('obj'), bucket_id: c.req.param('bucket'), name: c.req.param('path'), content: String(content), metadata: input.metadata ?? { size: String(String(content).length) }, created_at: now(), updated_at: now() }; next.objects.push(obj); save(store, next); return c.json(objectMetadata(obj), 201); });
  app.get('/storage/v1/object/list/:bucket', (c) => c.json(state(store).objects.filter((object) => object.bucket_id === c.req.param('bucket')).map(objectMetadata)));
  app.get('/storage/v1/object/:bucket/:path', (c) => { const next = state(store); const bucket = next.buckets.find((b) => b.id === c.req.param('bucket') || b.name === c.req.param('bucket')); const object = findObject(next, c.req.param('bucket'), c.req.param('path')); if (!object) return c.json({ error: 'not_found', message: 'Object not found' }, 404); if (bucket && !bucket.public && !c.req.header?.('authorization') && !c.req.header?.('apikey')) return c.json({ error: 'not_found', message: 'Object not found' }, 404); return raw(c, object.content ?? ''); });
  app.get('/storage/v1/object/authenticated/:bucket/:path', (c) => { const object = findObject(state(store), c.req.param('bucket'), c.req.param('path')); return object ? raw(c, object.content ?? '') : c.json({ error: 'not_found', message: 'Object not found' }, 404); });
  app.get('/rest/v1/:table', (c) => c.json(state(store).tables[c.req.param('table')] ?? []));
  app.post('/rest/v1/:table', async (c) => { const next = state(store); const row = { id: id('row'), ...(await body(c)), created_at: now() }; next.tables[c.req.param('table')] ??= []; next.tables[c.req.param('table')].push(row); save(store, next); return c.json(row, 201); });
  app.get('/inspect/postgres-contract', (c) => c.json(state(store).postgres));
  app.get('/inspect/storage/buckets', (c) => c.json(state(store).buckets.map(bucketMetadata)));
  app.get('/inspect/storage/objects', (c) => c.json(state(store).objects.map(objectMetadata)));
  app.get('/inspect/contract', (c) => c.json(contract));
  app.get('/inspect/state', (c) => c.json(state(store)));
  app.post('/inspect/reset', (c) => { store.setData?.('supabase:state', null); state(store); return c.json({ ok: true }); });
  app.post('/_emu/supabase/branches', async (c) => {
    const input = await body(c);
    const source = input.source ?? input.parent ?? 'postgres';
    const target = input.name ?? input.branch ?? `agent_branch_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
    await branch(source, target);
    return c.json({ name: target, parent: source, connection_uri: `postgres://postgres:postgres@127.0.0.1:55432/${target}` }, 201);
  });
  app.get('/_emu/supabase/branches', async (c) => c.json({ data: await listBranches() }));
  app.delete('/_emu/supabase/branches/:branch', async (c) => { await deleteBranch(c.req.param('branch')); return c.json({ ok: true }); });
  app.post('/_emu/supabase/branches/:branch/exec', async (c) => {
    const input = await body(c);
    if (!input.sql) return c.json({ error: 'missing_sql' }, 400);
    return c.json({ stdout: await execSql(c.req.param('branch'), input.sql) });
  });
  app.get('/_emu/supabase/branches/:branch/diff', async (c) => c.json(await diffBranch(c.req.param('branch'), c.req.query?.('parent') ?? 'postgres')));
  app.post('/_emu/supabase/branches/:branch/promote', async (c) => {
    const input = await body(c);
    await promoteBranch(c.req.param('branch'), input.parent ?? 'postgres');
    return c.json({ ok: true });
  });
}
