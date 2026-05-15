import assert from 'node:assert/strict';
import { plugin } from './api-emulator.mjs';

const routes = [];
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
};
const store = {
  data: new Map(),
  getData(key) { return this.data.get(key); },
  setData(key, value) { this.data.set(key, value); },
};

plugin.register(app, store);

function match(routePath, requestPath) {
  const routeParts = routePath.split('/').filter(Boolean);
  const requestParts = requestPath.split('/').filter(Boolean);
  if (routeParts.length !== requestParts.length) return null;
  const params = {};
  for (let i = 0; i < routeParts.length; i += 1) {
    if (routeParts[i].startsWith(':')) params[routeParts[i].slice(1)] = decodeURIComponent(requestParts[i]);
    else if (routeParts[i] !== requestParts[i]) return null;
  }
  return params;
}

async function request(method, path, body) {
  const route = routes.find((item) => item.method === method && match(item.path, path));
  assert.ok(route, `${method} ${path} route should exist`);
  let status = 200;
  let payload;
  await route.handler({
    req: {
      param: (name) => match(route.path, path)[name],
      query: () => undefined,
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

const missing = await request('POST', '/chat/outbound', { text: 'Hello' });
assert.equal(missing.status, 400);

const created = await request('POST', '/chat/outbound', { text: 'Can we help?', user_id: 'user_ada', flow_id: 'flow_support', metadata: { channel: 'email' } });
assert.equal(created.status, 202);
assert.equal(created.payload.status, 'queued');

const state = await request('GET', '/inspect/state');
assert.equal(state.payload.outboundMessages[0].text, 'Can we help?');

console.log('decagon smoke ok');
