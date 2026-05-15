import { branch, deleteBranch, diffBranch, execSql, exportBranch, listBranches, promoteBranch } from '../../local-postgres/branch.mjs';

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
function sqlLiteral(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}
function sqlJsonb(value) {
  return `${sqlLiteral(JSON.stringify(value ?? {}))}::jsonb`;
}
function sqlBigint(value) {
  if (value === null || value === undefined || value === '') return 'null';
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) return 'null';
  return String(number);
}
function sqlTextArray(value) {
  if (!Array.isArray(value)) return 'null';
  return `array[${value.map(sqlLiteral).join(', ')}]::text[]`;
}
async function pgJson(sql, fallback) {
  try {
    const out = await execSql('postgres', `copy (${sql}) to stdout`);
    return out.trim() ? JSON.parse(out.trim()) : fallback;
  } catch {
    return fallback;
  }
}
async function insertPgBucket(bucket) {
  await execSql('postgres', `
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
    values (${sqlLiteral(bucket.id)}, ${sqlLiteral(bucket.name)}, ${bucket.public ? 'true' : 'false'}, ${sqlBigint(bucket.file_size_limit)}, ${sqlTextArray(bucket.allowed_mime_types)}, ${sqlLiteral(bucket.created_at)}::timestamptz, ${sqlLiteral(bucket.updated_at)}::timestamptz)
    on conflict (id) do update set
      name = excluded.name,
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      updated_at = excluded.updated_at
  `);
}
async function insertPgObject(object) {
  await execSql('postgres', `
    insert into storage.objects (bucket_id, name, metadata, created_at, updated_at, last_accessed_at)
    values (${sqlLiteral(object.bucket_id)}, ${sqlLiteral(object.name)}, ${sqlJsonb(object.metadata)}, ${sqlLiteral(object.created_at)}::timestamptz, ${sqlLiteral(object.updated_at)}::timestamptz, ${sqlLiteral(object.last_accessed_at ?? object.created_at)}::timestamptz)
    on conflict (bucket_id, name) do update set
      metadata = excluded.metadata,
      updated_at = excluded.updated_at,
      last_accessed_at = excluded.last_accessed_at
  `);
}
function pgBucketSelect(where = 'true') {
  return `
    select coalesce(json_agg(json_build_object(
      'id', id,
      'name', name,
      'public', public,
      'file_size_limit', file_size_limit,
      'allowed_mime_types', allowed_mime_types,
      'created_at', created_at,
      'updated_at', updated_at
    ) order by id), '[]'::json)::text
    from storage.buckets
    where ${where}
  `;
}
function pgObjectSelect(where = 'true') {
  return `
    select coalesce(json_agg(json_build_object(
      'id', id,
      'bucket_id', bucket_id,
      'name', name,
      'owner', owner,
      'metadata', metadata,
      'created_at', created_at,
      'updated_at', updated_at,
      'last_accessed_at', last_accessed_at
    ) order by bucket_id, name), '[]'::json)::text
    from storage.objects
    where ${where}
  `;
}
async function listPgBuckets(fallback) {
  return pgJson(pgBucketSelect(), fallback);
}
async function getPgBucket(bucket, fallback) {
  const rows = await pgJson(pgBucketSelect(`id = ${sqlLiteral(bucket)} or name = ${sqlLiteral(bucket)}`), []);
  return rows[0] ?? fallback;
}
async function listPgObjects(bucket, fallback) {
  return pgJson(pgObjectSelect(`bucket_id = ${sqlLiteral(bucket)}`), fallback);
}
async function getPgObject(bucket, path, fallback) {
  const rows = await pgJson(pgObjectSelect(`bucket_id = ${sqlLiteral(bucket)} and name = ${sqlLiteral(path)}`), []);
  return rows[0] ?? fallback;
}
export function registerRoutes(app, store, contract) {
  app.post('/auth/v1/signup', async (c) => { const next = state(store); const input = await body(c); const user = { id: id('user'), email: input.email, password: input.password, created_at: now(), user_metadata: input.data ?? {} }; next.users.push(user); const token = 'sb_' + crypto.randomUUID(); next.sessions.push({ access_token: token, user_id: user.id, created_at: now() }); save(store, next); return c.json({ access_token: token, token_type: 'bearer', user: publicUser(user) }); });
  app.post('/auth/v1/token', async (c) => { const next = state(store); const input = await body(c); const user = next.users.find((u) => u.email === input.email && (!u.password || u.password === input.password)); if (!user) return c.json({ error: 'invalid_grant' }, 400); const token = 'sb_' + crypto.randomUUID(); next.sessions.push({ access_token: token, user_id: user.id, created_at: now() }); save(store, next); return c.json({ access_token: token, token_type: 'bearer', user: publicUser(user) }); });
  app.get('/auth/v1/user', (c) => { const token = c.req.header?.('authorization')?.replace(/^Bearer\s+/i, ''); const session = state(store).sessions.find((s) => s.access_token === token); const user = state(store).users.find((u) => u.id === session?.user_id); return user ? c.json(publicUser(user)) : c.json({ error: 'invalid_token' }, 401); });
  app.get('/auth/v1/admin/users', (c) => c.json({ users: state(store).users.map(publicUser) }));
  app.post('/storage/v1/bucket', async (c) => { const next = state(store); const input = await body(c); const bucket = { id: input.id ?? input.name, name: input.name ?? input.id, public: Boolean(input.public), file_size_limit: input.file_size_limit ?? null, allowed_mime_types: input.allowed_mime_types ?? null, created_at: now(), updated_at: now() }; next.buckets = next.buckets.filter((existing) => existing.id !== bucket.id); next.buckets.push(bucket); save(store, next); await insertPgBucket(bucket).catch(() => undefined); return c.json(bucketMetadata(bucket), 201); });
  app.get('/storage/v1/bucket', async (c) => c.json((await listPgBuckets(state(store).buckets)).map(bucketMetadata)));
  app.get('/storage/v1/bucket/:bucket', async (c) => { const fallback = state(store).buckets.find((b) => b.id === c.req.param('bucket') || b.name === c.req.param('bucket')); const bucket = await getPgBucket(c.req.param('bucket'), fallback); return bucket ? c.json(bucketMetadata(bucket)) : c.json({ error: 'not_found', message: 'Bucket not found' }, 404); });
  app.post('/storage/v1/object/:bucket/:path', async (c) => { const next = state(store); const input = await body(c); const content = input.content ?? input.body ?? ''; const obj = { id: id('obj'), bucket_id: c.req.param('bucket'), name: c.req.param('path'), content: String(content), metadata: input.metadata ?? { size: String(String(content).length) }, created_at: now(), updated_at: now() }; next.objects = next.objects.filter((existing) => existing.bucket_id !== obj.bucket_id || existing.name !== obj.name); next.objects.push(obj); save(store, next); await insertPgObject(obj).catch(() => undefined); return c.json(objectMetadata(obj), 201); });
  app.get('/storage/v1/object/list/:bucket', async (c) => c.json((await listPgObjects(c.req.param('bucket'), state(store).objects.filter((object) => object.bucket_id === c.req.param('bucket')))).map(objectMetadata)));
  app.get('/storage/v1/object/:bucket/:path', async (c) => { const next = state(store); const fallbackBucket = next.buckets.find((b) => b.id === c.req.param('bucket') || b.name === c.req.param('bucket')); const bucket = await getPgBucket(c.req.param('bucket'), fallbackBucket); const fallbackObject = findObject(next, c.req.param('bucket'), c.req.param('path')); const object = await getPgObject(c.req.param('bucket'), c.req.param('path'), fallbackObject); if (!object) return c.json({ error: 'not_found', message: 'Object not found' }, 404); if (bucket && !bucket.public && !c.req.header?.('authorization') && !c.req.header?.('apikey')) return c.json({ error: 'not_found', message: 'Object not found' }, 404); return raw(c, fallbackObject?.content ?? object.content ?? ''); });
  app.get('/storage/v1/object/authenticated/:bucket/:path', async (c) => { const fallbackObject = findObject(state(store), c.req.param('bucket'), c.req.param('path')); const object = await getPgObject(c.req.param('bucket'), c.req.param('path'), fallbackObject); return object ? raw(c, fallbackObject?.content ?? object.content ?? '') : c.json({ error: 'not_found', message: 'Object not found' }, 404); });
  app.get('/rest/v1/:table', (c) => c.json(state(store).tables[c.req.param('table')] ?? []));
  app.post('/rest/v1/:table', async (c) => { const next = state(store); const row = { id: id('row'), ...(await body(c)), created_at: now() }; next.tables[c.req.param('table')] ??= []; next.tables[c.req.param('table')].push(row); save(store, next); return c.json(row, 201); });
  app.get('/inspect/postgres-contract', (c) => c.json(state(store).postgres));
  app.get('/inspect/storage/buckets', async (c) => c.json((await listPgBuckets(state(store).buckets)).map(bucketMetadata)));
  app.get('/inspect/storage/objects', async (c) => c.json((await pgJson(pgObjectSelect(), state(store).objects)).map(objectMetadata)));
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
  app.get('/_emu/supabase/branches/:branch/export', async (c) => c.json({ sql: await exportBranch(c.req.param('branch')) }));
  app.post('/_emu/supabase/branches/:branch/promote', async (c) => {
    const input = await body(c);
    await promoteBranch(c.req.param('branch'), input.parent ?? 'postgres');
    return c.json({ ok: true });
  });
  app.post('/_emu/db/supabase/databases', async (c) => c.json({ id: (await body(c)).id ?? 'postgres' }, 201));
  app.get('/_emu/db/supabase/databases', async (c) => c.json({ data: [{ id: 'postgres' }] }));
  app.post('/_emu/db/supabase/databases/:id/branches', async (c) => {
    const input = await body(c);
    const target = input.name ?? input.branch ?? `agent_branch_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
    await branch(c.req.param('id'), target);
    return c.json({ database: c.req.param('id'), branch: target, connection_uri: `postgres://postgres:postgres@127.0.0.1:55432/${target}` }, 201);
  });
  app.get('/_emu/db/supabase/databases/:id/branches', async (c) => c.json({ data: await listBranches() }));
  app.delete('/_emu/db/supabase/databases/:id/branches/:branch', async (c) => { await deleteBranch(c.req.param('branch')); return c.json({ ok: true }); });
  app.post('/_emu/db/supabase/databases/:id/branches/:branch/exec', async (c) => {
    const input = await body(c);
    if (!input.sql) return c.json({ error: 'missing_sql' }, 400);
    return c.json({ stdout: await execSql(c.req.param('branch'), input.sql) });
  });
  app.get('/_emu/db/supabase/databases/:id/branches/:branch/export', async (c) => c.json({ sql: await exportBranch(c.req.param('branch')) }));
  app.get('/_emu/db/supabase/databases/:id/branches/:branch/diff', async (c) => c.json(await diffBranch(c.req.param('branch'), c.req.param('id'))));
  app.post('/_emu/db/supabase/databases/:id/branches/:branch/promote', async (c) => { await promoteBranch(c.req.param('branch'), c.req.param('id')); return c.json({ ok: true }); });
}
