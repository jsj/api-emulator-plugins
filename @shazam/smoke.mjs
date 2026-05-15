import assert from 'node:assert/strict';
import { plugin, contract, initConfig } from './api-emulator.mjs';

const routes = [];
const data = new Map();
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
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
  const url = new URL(`http://shazam.local${path}`);
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
  });
  return { status, payload };
}

assert.equal(contract.provider, 'shazam');
assert.equal(initConfig.shazam.songs[0].attributes.shazamCount, 42000);

const search = await request('GET', '/v1/search?term=recognize');
assert.equal(search.payload.tracks.hits[0].track.title, 'Recognize This Mock');

const chart = await request('GET', '/v1/charts/us');
assert.equal(chart.payload.data.length, 2);

const metadata = await request('GET', '/v1/catalog/us/songs/shazam_song_seed/shazam');
assert.equal(metadata.payload.data[0].attributes.artistName, 'Shazam Emulator');

const createdMatch = await request('POST', '/v1/matches', { signature: 'emulator-audio-signature' });
assert.equal(createdMatch.status, 201);
assert.equal(createdMatch.payload.matches[0].song.id, 'shazam_song_seed');

const fetched = await request('GET', `/v1/matches/${createdMatch.payload.matches[0].id}`);
assert.equal(fetched.payload.song.id, 'shazam_song_seed');

console.log('shazam smoke ok');
