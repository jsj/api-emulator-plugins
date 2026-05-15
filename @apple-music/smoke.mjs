import assert from 'node:assert/strict';
import { plugin, contract, developerToken, initConfig } from './api-emulator.mjs';

const routes = [];
const data = new Map();
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  put: (path, handler) => routes.push({ method: 'PUT', path, handler }),
  delete: (path, handler) => routes.push({ method: 'DELETE', path, handler }),
};
const store = {
  getData: (key) => data.get(key),
  setData: (key, value) => data.set(key, value),
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
  const url = new URL(`http://apple-music.local${path}`);
  const route = routes.find((item) => item.method === method && match(item.path, url.pathname));
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, url.pathname);
  let status = 200;
  let payload;
  await route.handler({
    req: {
      url: url.toString(),
      param: (name) => params[name],
      query: (name) => url.searchParams.get(name) ?? undefined,
      queries: (name) => url.searchParams.getAll(name),
      json: async () => body ?? {},
    },
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

assert.equal(contract.provider, 'apple-music');
assert.match(developerToken(), /^[^.]+\.[^.]+\.emulator-signature$/);
assert.match(initConfig.appleMusic.developerToken, /^[^.]+\.[^.]+\.emulator-signature$/);

const itunes = await request('GET', '/search?term=cupertino&media=music&entity=song&limit=5&country=US');
assert.equal(itunes.payload.resultCount, 1);
assert.equal(itunes.payload.results[0].trackName, 'Cupertino Mock');

const catalog = await request('GET', '/v1/catalog/us/search?term=apple&types=songs,albums,artists&limit=10');
assert.equal(catalog.payload.results.songs.data[0].id, 'apple_song_seed');
assert.equal(catalog.payload.results.albums.data[0].id, 'apple_album_seed');

const song = await request('GET', '/v1/catalog/us/songs/apple_song_seed');
assert.equal(song.payload.data[0].attributes.name, 'Cupertino Mock');

const created = await request('POST', '/v1/me/library/playlists', {
  attributes: { name: 'Smoke Playlist' },
  relationships: { tracks: { data: [{ id: 'apple_song_seed', type: 'library-songs' }] } },
});
assert.equal(created.status, 201);
assert.match(created.payload.data[0].id, /^apple_playlist_/);

await request('POST', `/v1/me/library/playlists/${created.payload.data[0].id}/tracks`, {
  data: [{ id: 'apple_song_two', type: 'library-songs' }],
});
const tracks = await request('GET', `/v1/me/library/playlists/${created.payload.data[0].id}/tracks`);
assert.equal(tracks.payload.data.length, 2);

await request('DELETE', `/v1/me/library/playlists/${created.payload.data[0].id}/tracks?ids%5Blibrary-songs%5D=apple_song_seed`);
const updated = await request('GET', `/v1/me/library/playlists/${created.payload.data[0].id}/tracks`);
assert.equal(updated.payload.data.length, 1);
assert.equal(updated.payload.data[0].id, 'apple_song_two');

console.log('apple music smoke ok');
