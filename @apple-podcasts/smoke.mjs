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
  const url = new URL(`http://apple-podcasts.local${path}`);
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

assert.equal(contract.provider, 'apple-podcasts');
assert.equal(initConfig.applePodcasts.profile.storeFront, '143441-1,29');

const search = await request('GET', '/search?term=emulator&media=podcast&entity=podcast');
assert.equal(search.payload.results[0].collectionName, 'Emulator Daily');

const lookup = await request('GET', '/lookup?id=1700000001&entity=podcastEpisode');
assert.equal(lookup.payload.resultCount, 3);

const episodes = await request('GET', '/v1/catalog/us/podcasts/1700000001/episodes');
assert.equal(episodes.payload.data.length, 2);

await request('PUT', '/v1/me/library/podcasts/1700000002');
const subscriptions = await request('GET', '/v1/me/library/podcasts');
assert.equal(subscriptions.payload.data.length, 2);

await request('DELETE', '/v1/me/library/podcasts/1700000001');
const updated = await request('GET', '/v1/me/library/podcasts');
assert.equal(updated.payload.data.length, 1);
assert.equal(updated.payload.data[0].id, '1700000002');

console.log('apple podcasts smoke ok');
