import assert from 'node:assert/strict';
import { plugin, contract } from './api-emulator.mjs';

const routes = [];
const data = new Map();
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
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
  const url = new URL(`http://youtube-music.local${path}`);
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
    text: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

assert.equal(contract.provider, 'youtube-music');

const search = await request('POST', '/youtubei/v1/search?alt=json', { query: 'localhost' });
const shelf = search.payload.contents.tabbedSearchResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].musicShelfRenderer;
assert.equal(shelf.contents[0].musicResponsiveListItemRenderer.playlistItemData.videoId, 'ytm_video_seed');

const browse = await request('POST', '/youtubei/v1/browse?alt=json', { browseId: 'ytm_album_seed' });
assert.ok(browse.payload.header.musicDetailHeaderRenderer.title.runs[0].text.includes('InnerTube'));

const player = await request('POST', '/youtubei/v1/player?alt=json', { videoId: 'ytm_video_seed' });
assert.equal(player.payload.playabilityStatus.status, 'OK');
assert.equal(player.payload.videoDetails.videoId, 'ytm_video_seed');

const created = await request('POST', '/youtubei/v1/playlist/create?alt=json', { title: 'Smoke Playlist', videoIds: ['ytm_video_seed'] });
assert.match(created.payload.playlistId, /^PL_ytm_/);

await request('POST', '/youtubei/v1/browse/edit_playlist?alt=json', {
  playlistId: created.payload.playlistId,
  actions: [{ action: 'ACTION_ADD_VIDEO', addedVideoId: 'ytm_video_two' }],
});
await request('POST', '/youtubei/v1/like/like?alt=json', { target: { videoId: 'ytm_video_seed' } });
await request('POST', '/youtubei/v1/subscription/subscribe?alt=json', { channelIds: ['ytm_artist_seed'] });
const state = await request('GET', '/inspect/state');
assert.deepEqual(state.payload.likedVideoIds, ['ytm_video_seed']);
assert.deepEqual(state.payload.subscriptions, ['ytm_artist_seed']);
assert.equal(state.payload.playlists.find((item) => item.playlistId === created.payload.playlistId).videoIds.length, 2);

console.log('youtube music smoke ok');
