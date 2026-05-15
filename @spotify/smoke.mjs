import assert from 'node:assert/strict';
import { plugin, contract } from './api-emulator.mjs';

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
  const url = new URL(`http://spotify.local${path}`);
  const route = routes.find((item) => item.method === method && match(item.path, url.pathname));
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, url.pathname);
  let status = 200;
  let payload;
  await route.handler({
    req: {
      param: (name) => params[name],
      query: (name) => url.searchParams.get(name) ?? undefined,
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

assert.equal(contract.provider, 'spotify');

const me = await request('GET', '/v1/me');
assert.equal(me.payload.id, 'spotify_user_seed');

const search = await request('GET', '/v1/search?q=emulator&type=track,album,artist,playlist&limit=10');
assert.equal(search.payload.tracks.items[0].id, 'spotify_track_seed');
assert.equal(search.payload.track.items[0].id, 'spotify_track_seed');
assert.equal(search.payload.albums.items[0].id, 'spotify_album_seed');

const playlist = await request('GET', '/v1/playlists/spotify_playlist_seed');
assert.equal(playlist.payload.tracks.total, 2);
const show = await request('GET', '/v1/shows/spotify_show_seed');
assert.equal(show.payload.name, 'Emulator FM');
const episode = await request('GET', '/v1/episodes/spotify_episode_seed');
assert.equal(episode.payload.name, 'The Mock Episode');

const created = await request('POST', '/v1/users/spotify_user_seed/playlists', { name: 'Smoke Playlist' });
assert.equal(created.status, 201);
await request('POST', `/v1/playlists/${created.payload.id}/tracks`, { uris: ['spotify:track:spotify_track_seed'] });
const tracks = await request('GET', `/v1/playlists/${created.payload.id}/tracks`);
assert.equal(tracks.payload.items[0].track.id, 'spotify_track_seed');

await request('PUT', '/v1/me/player/play', { uris: ['spotify:track:spotify_track_two'] });
const player = await request('GET', '/v1/me/player');
assert.equal(player.payload.is_playing, true);
assert.equal(player.payload.item.id, 'spotify_track_two');
await request('PUT', '/v1/me/following?type=artist&ids=spotify_artist_seed');
const following = await request('GET', '/v1/me/following?type=artist&limit=10');
assert.equal(following.payload.artists.items[0].id, 'spotify_artist_seed');

await request('POST', '/v1/me/player/queue?uri=spotify%3Atrack%3Aspotify_track_seed');
const queue = await request('GET', '/v1/me/player/queue');
assert.equal(queue.payload.queue[0].id, 'spotify_track_seed');

console.log('spotify smoke ok');
