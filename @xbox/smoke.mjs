import assert from 'node:assert/strict';
import { contract, plugin } from './api-emulator.mjs';

const routes = [];
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  put: (path, handler) => routes.push({ method: 'PUT', path, handler }),
  patch: (path, handler) => routes.push({ method: 'PATCH', path, handler }),
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

assert.equal(contract.provider, 'xbox');
const apps = await request('GET', '/v1.0/my/applications');
assert.equal(apps.payload.value[0].id, '9NBLGGH4R315');
const created = await request('POST', '/v1.0/my/applications/9NBLGGH4R315/submissions');
assert.equal(created.status, 201);
const updated = await request('PUT', `/v1.0/my/applications/9NBLGGH4R315/submissions/${created.payload.id}`, { friendlyName: 'Smoke Submission' });
assert.equal(updated.payload.friendlyName, 'Smoke Submission');
const committed = await request('POST', `/v1.0/my/applications/9NBLGGH4R315/submissions/${created.payload.id}/commit`);
assert.equal(committed.payload.status, 'CommitStarted');
const flights = await request('GET', '/v1.0/my/applications/9NBLGGH4R315/listflights');
assert.equal(flights.payload.value[0].flightId, 'beta');
const listings = await request('GET', '/submission/v1/product/9NBLGGH4R315/metadata/listings');
assert.equal(listings.payload.responseData.listings['en-us'].title, 'Emulator Adventure');
const patchedPackage = await request('PATCH', '/submission/v1/product/9NBLGGH4R315/packages/package_seed', { state: 'Published' });
assert.equal(patchedPackage.payload.responseData.state, 'Published');
const storeSubmission = await request('POST', '/submission/v1/product/9NBLGGH4R315/submission');
assert.equal(storeSubmission.status, 201);

console.log('xbox smoke ok');
