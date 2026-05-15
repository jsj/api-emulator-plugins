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

async function request(method, path, body) {
  const url = new URL(`http://prime-music.local${path}`);
  const route = routes.find((item) => item.method === method && match(item.path, url.pathname));
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, url.pathname);
  let status = 200;
  let payload;
  await route.handler({
    req: { url: url.toString(), param: (name) => params[name], query: (name) => url.searchParams.get(name) ?? undefined, json: async () => body ?? {} },
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

assert.equal(contract.provider, 'prime-music');
assert.equal(initConfig.primeMusic.profile.subscriptionTier, 'PRIME');

const search = await request('GET', '/v1/search?q=prime');
assert.equal(search.payload.tracks.items[0].id, 'B000PRIMETRACK1');

const album = await request('GET', '/v1/albums/B000PRIMEALBUM');
assert.equal(album.payload.tracks.items.length, 2);

await request('PUT', '/v1/me/library/tracks/B000PRIMETRACK2');
const library = await request('GET', '/v1/me/library/tracks');
assert.equal(library.payload.items.length, 2);

const player = await request('PUT', '/v1/me/player/play', { trackId: 'B000PRIMETRACK2' });
assert.equal(player.payload.isPlaying, true);
assert.equal(player.payload.track.id, 'B000PRIMETRACK2');

await request('DELETE', '/v1/me/library/tracks/B000PRIMETRACK1');
const updated = await request('GET', '/v1/me/library/tracks');
assert.equal(updated.payload.items.length, 1);
assert.equal(updated.payload.items[0].id, 'B000PRIMETRACK2');

console.log('prime music smoke ok');
