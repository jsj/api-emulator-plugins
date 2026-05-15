import assert from 'node:assert/strict';
import { plugin, contract, initConfig } from './api-emulator.mjs';

const routes = [];
const data = new Map();
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  put: (path, handler) => routes.push({ method: 'PUT', path, handler }),
  delete: (path, handler) => routes.push({ method: 'DELETE', path, handler }),
};
const store = { getData: (key) => data.get(key), setData: (key, value) => data.set(key, value) };

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

async function request(method, path) {
  const url = new URL(`http://siriusxm.local${path}`);
  const route = routes.find((item) => item.method === method && match(item.path, url.pathname));
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, url.pathname);
  let status = 200;
  let payload;
  await route.handler({
    req: { url: url.toString(), param: (name) => params[name], query: (name) => url.searchParams.get(name) ?? undefined },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
    body: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

assert.equal(contract.provider, 'siriusxm');
assert.equal(initConfig.siriusxm.profile.subscriptionStatus, 'active');

const channels = await request('GET', '/v1/channels?q=hits');
assert.equal(channels.payload.data[0].id, 'sxm_001');

const nowPlaying = await request('GET', '/v1/channels/sxm_001/now-playing');
assert.equal(nowPlaying.payload.data.track.title, 'Satellite Mock');

await request('PUT', '/v1/me/favorites/channels/sxm_002');
const favorites = await request('GET', '/v1/me/favorites/channels');
assert.equal(favorites.payload.data.length, 2);

await request('DELETE', '/v1/me/favorites/channels/sxm_001');
const updated = await request('GET', '/v1/me/favorites/channels');
assert.equal(updated.payload.data.length, 1);
assert.equal(updated.payload.data[0].id, 'sxm_002');

console.log('siriusxm smoke ok');
