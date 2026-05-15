import assert from 'node:assert/strict';
import { contract, plugin } from './api-emulator.mjs';

const routes = [];
const data = new Map();
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
};
plugin.register(app, { getData: (key) => data.get(key), setData: (key, value) => data.set(key, value) });

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
  const url = new URL(path, 'http://sourcegraph.local');
  const route = routes.find((item) => item.method === method && match(item.path, url.pathname));
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, url.pathname);
  let status = 200;
  let payload;
  await route.handler({
    req: { param: (name) => params[name], query: (name) => url.searchParams.get(name) ?? undefined, json: async () => body ?? {} },
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

assert.equal(contract.provider, 'sourcegraph');

const identity = await request('POST', '/.api/graphql', { query: 'query { currentUser { username } }' });
assert.equal(identity.payload.data.currentUser.username, 'emulator');

const gqlSearch = await request('POST', '/.api/graphql', { query: 'query Search($query: String!) { search(query: $query) { matchCount } }', variables: { query: 'emulator' } });
assert.equal(gqlSearch.payload.data.search.matchCount, 1);

const stream = await request('GET', '/.api/search/stream?q=context');
assert.match(stream.payload, /event: matches/);

const models = await request('GET', '/.api/llm/models');
assert.ok(models.payload.data.length >= 1);

const context = await request('POST', '/.api/cody/context', { query: 'router' });
assert.equal(context.payload.results[0].repository, 'github.com/sourcegraph/emulator');

const state = await request('GET', '/sourcegraph/inspect/state');
assert.equal(state.payload.searches.length, 2);

console.log('sourcegraph smoke ok');
