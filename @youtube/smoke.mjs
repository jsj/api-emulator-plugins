import assert from 'node:assert/strict';
import { plugin } from './api-emulator.mjs';

const routes = [];
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  put: (path, handler) => routes.push({ method: 'PUT', path, handler }),
  delete: (path, handler) => routes.push({ method: 'DELETE', path, handler }),
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

async function request(method, input, body) {
  const url = new URL(input, 'http://localhost');
  const route = routes.find((item) => item.method === method && match(item.path, url.pathname));
  assert.ok(route, `${method} ${url.pathname} route should exist`);
  const params = match(route.path, url.pathname);
  let status = 200;
  let payload;
  await route.handler({
    req: {
      param: (name) => params[name],
      query: (name) => url.searchParams.get(name) ?? undefined,
      json: async () => body ?? {},
      text: async () => '',
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

const search = await request('GET', '/youtube/v3/search?q=emulator&type=video');
assert.equal(search.payload.items[0].id.videoId, 'video_cli_seed');
const channels = await request('GET', '/youtube/v3/channels?mine=true');
assert.equal(channels.payload.items[0].id, 'UC_emulator_creator');
const videos = await request('GET', '/youtube/v3/videos?id=video_cli_seed');
assert.equal(videos.payload.items[0].snippet.title, 'YouTube CLI Seed Video');
const playlists = await request('GET', '/youtube/v3/playlists?channelId=UC_emulator_creator');
assert.equal(playlists.payload.items[0].id, 'PL_emulator_creator');
const playlistItem = await request('POST', '/youtube/v3/playlistItems?part=snippet', {
  snippet: {
    playlistId: 'PL_emulator_creator',
    resourceId: { kind: 'youtube#video', videoId: 'video_cli_seed' },
  },
});
assert.equal(playlistItem.payload.snippet.playlistId, 'PL_emulator_creator');
const upload = await request('POST', '/upload/youtube/v3/videos?part=snippet,status');
assert.match(upload.payload.id, /^video_cli_upload_/);
const report = await request('GET', '/v2/reports?ids=channel==MINE&metrics=views,likes&startDate=2026-05-15&endDate=2026-05-15');
assert.equal(report.payload.rows[0][1], 1234);
const groups = await request('GET', '/v2/groups?mine=true');
assert.equal(groups.payload.items[0].id, 'group_cli_seed');
const groupItems = await request('GET', '/v2/groupItems?groupId=group_cli_seed');
assert.equal(groupItems.payload.items[0].resource.id, 'video_cli_seed');

console.log('youtube smoke ok');
