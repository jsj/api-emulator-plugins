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
  const url = new URL(path, 'http://greptile.local');
  const route = routes.find((item) => item.method === method && match(item.path, url.pathname));
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, url.pathname);
  let status = 200;
  let payload;
  await route.handler({
    req: { param: (name) => params[name], json: async () => body ?? {} },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

assert.equal(contract.provider, 'greptile');

const repo = await request('POST', '/v2/repositories', { remote: 'github', repository: 'example/repo', branch: 'main' });
assert.equal(repo.status, 202);
assert.equal(repo.payload.status, 'indexed');

const fetched = await request('GET', `/v2/repositories/${repo.payload.id}`);
assert.equal(fetched.payload.repository, 'example/repo');

const query = await request('POST', '/v2/query', { repository: 'example/repo', branch: 'main', message: 'Where are routes defined?' });
assert.match(query.payload.answer, /Where are routes defined/);

const search = await request('POST', '/v2/search', { repository: 'example/repo', query: 'contract' });
assert.equal(search.payload.results[0].filepath, 'README.md');

const state = await request('GET', '/greptile/inspect/state');
assert.equal(state.payload.queries.length, 1);
assert.equal(state.payload.searches.length, 1);

console.log('greptile smoke ok');
