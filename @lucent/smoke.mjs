import assert from 'node:assert/strict';
import { plugin, contract, routes } from './api-emulator.mjs';

const registered = [];
const data = new Map();
const app = {
  get: (path, handler) => registered.push({ method: 'GET', path, handler }),
  post: (path, handler) => registered.push({ method: 'POST', path, handler }),
};
const store = {
  getData: (key) => data.get(key),
  setData: (key, value) => data.set(key, value),
};

plugin.register(app, store);

function findRoute(method, path) {
  const route = registered.find((item) => item.method === method && item.path === path);
  assert.ok(route, `${method} ${path} route should exist`);
  return route;
}

async function request(method, path, body, headers = {}) {
  const url = new URL(path, 'http://lucent.local');
  const route = findRoute(method, url.pathname);
  let status = 200;
  let payload;
  await route.handler({
    req: {
      url: url.toString(),
      query: (name) => url.searchParams.get(name) ?? undefined,
      header: (name) => headers[name.toLowerCase()],
      json: async () => body ?? {},
    },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

assert.equal(contract.provider, 'lucent');
assert.equal(contract.coverage.routeCount, routes.length);
for (const route of routes) {
  findRoute(route.method, route.path);
}

const invalid = await request('POST', '/api/sdk/init', {}, { 'x-lucent-api-key': 'bad' });
assert.equal(invalid.status, 401);

const init = await request('POST', '/api/sdk/init', {}, { 'x-lucent-api-key': 'luc_pk_emulator' });
assert.equal(init.status, 200);
assert.equal(init.payload.ok, true);

const replay = await request('POST', '/api/sdk/replay?api_key=luc_pk_emulator', {
  session: { id: 'session_smoke', windowId: 'window_smoke' },
  replay: { sequence: 0, events: [{ type: 0, data: { href: 'https://example.test' } }] },
  flush: 'normal',
});
assert.equal(replay.status, 202);
assert.equal(replay.payload.stored_events, 1);

const listed = await request('GET', '/api/sdk/replays');
assert.equal(listed.payload.data[0].session_id, 'session_smoke');
assert.equal(listed.payload.data[0].event_count, 1);

console.log('lucent smoke ok');
