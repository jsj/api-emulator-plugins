import assert from 'node:assert/strict';
import { contract, plugin } from './api-emulator.mjs';

const routes = [];
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  delete: (path, handler) => routes.push({ method: 'DELETE', path, handler }),
};
const store = {
  data: new Map(),
  getData(key) {
    return this.data.get(key);
  },
  setData(key, value) {
    this.data.set(key, value);
  },
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
  const url = new URL(path, 'http://127.0.0.1');
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
      json: async () => body ?? {},
    },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

assert.equal(contract.provider, 'argo');
const info = await request('GET', '/api/v1/info');
assert.equal(info.payload.managedNamespace, '');
const listed = await request('GET', '/api/v1/workflows/default');
assert.equal(listed.payload.kind, 'WorkflowList');
assert.equal(listed.payload.items[0].metadata.name, 'hello-world-emulator');
const created = await request('POST', '/api/v1/workflows/default', {
  workflow: {
    metadata: { generateName: 'smoke-' },
    spec: { entrypoint: 'main', templates: [{ name: 'main', container: { image: 'alpine:3.19' } }] },
  },
});
assert.equal(created.status, 200);
assert.match(created.payload.metadata.name, /^smoke-/);
const fetched = await request('GET', `/api/v1/workflows/default/${created.payload.metadata.name}`);
assert.equal(fetched.payload.metadata.name, created.payload.metadata.name);
const deleted = await request('DELETE', `/api/v1/workflows/default/${created.payload.metadata.name}`);
assert.equal(deleted.status, 200);

console.log('argo smoke ok');
