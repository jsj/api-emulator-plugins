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

async function request(method, path, body = {}) {
  const route = routes.find((item) => item.method === method && match(item.path, path));
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, path);
  let status = 200;
  let payload;
  await route.handler({
    req: {
      param: (name) => params[name],
      header: () => 'application/json',
      json: async () => body,
      parseBody: async () => body,
    },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

const channels = await request('GET', '/123456/release-channel-data');
assert.equal(channels.payload.release_channels[0].latest_build.id, 'quest_build_seed');

const graph = await request('POST', '/graphql', {
  query: 'query GetReleaseChannelData($appID: ID!) { application(id: $appID) { release_channels { name latest_build { id version } } } }',
  variables: { appID: '123456' },
});
assert.equal(graph.payload.data.release_channels[0].latest_build.version, '1.0.0');

const build = await request('POST', '/123456/builds', { version: '1.0.1', version_code: 101, draft: true });
assert.equal(build.status, 201);
assert.equal(build.payload.status, 'draft');

const assigned = await request('POST', '/123456/release_channels/BETA/build', { build_id: build.payload.id });
assert.equal(assigned.payload.latest_build.id, build.payload.id);

console.log('oculus smoke ok');
