function now() { return new Date().toISOString(); }
function id(prefix) { return prefix + '_' + crypto.randomUUID().replaceAll('-', '').slice(0, 20); }
function state(store) {
  const key = 'upstash:state';
  const existing = store.getData?.(key);
  if (existing) return existing;
  const initial = { redis: {}, databases: [], vectors: [], qstash: [] };
  store.setData?.(key, initial);
  return initial;
}
function save(store, next) { store.setData?.('upstash:state', next); }
async function body(c) {
  if (c.req.header?.('content-type')?.includes('application/json')) return c.req.json().catch(() => ({}));
  if (c.req.parseBody) return c.req.parseBody().catch(() => ({}));
  return c.req.json().catch(() => ({}));
}
function list(items) { return { data: items, pagination: { total: items.length } }; }
function redisReply(next, command, args) { const cmd = String(command).toUpperCase(); if (cmd === 'SET') { next.redis[args[0]] = args[1]; return 'OK'; } if (cmd === 'GET') return next.redis[args[0]] ?? null; if (cmd === 'DEL') { const existed = args.filter((k) => k in next.redis).length; args.forEach((k) => delete next.redis[k]); return existed; } if (cmd === 'INCR') return next.redis[args[0]] = String(Number(next.redis[args[0]] ?? 0) + 1); return null; }
function redisCommand(input) {
  if (Array.isArray(input)) return [input[0], input.slice(1)];
  return [input.command ?? input[0], input.args ?? input.slice?.(1) ?? []];
}
async function redisRest(c, store) {
  const next = state(store);
  const input = await body(c);
  const [command, args] = redisCommand(input);
  const result = redisReply(next, command, args);
  save(store, next);
  return c.json({ result });
}
export function registerRoutes(app, store, contract) {
  app.post('/', (c) => redisRest(c, store));
  app.post('/redis', (c) => redisRest(c, store));
  app.post('/upstash/redis', (c) => redisRest(c, store));
  app.post('/v2/redis/databases', async (c) => { const next = state(store); const db = { database_id: id('redis'), endpoint: 'localhost', state: 'active', ...(await body(c)) }; next.databases.push(db); save(store, next); return c.json(db, 201); });
  app.get('/v2/redis/databases', (c) => c.json(state(store).databases));
  app.post('/vector/upsert', async (c) => { const next = state(store); const input = await body(c); const vectors = Array.isArray(input.vectors) ? input.vectors : [input]; next.vectors.push(...vectors); save(store, next); return c.json({ upserted: vectors.length }); });
  app.post('/vector/query', async (c) => c.json({ matches: state(store).vectors.slice(0, Number((await body(c)).topK ?? 10)) }));
  app.post('/qstash/v2/publish/:destination', async (c) => { const next = state(store); const msg = { messageId: id('msg'), destination: c.req.param('destination'), body: await body(c), createdAt: now() }; next.qstash.push(msg); save(store, next); return c.json(msg); });
  app.get('/inspect/contract', (c) => c.json(contract));
  app.get('/inspect/state', (c) => c.json(state(store)));
  app.post('/inspect/reset', (c) => { store.setData?.('upstash:state', null); state(store); return c.json({ ok: true }); });
}
