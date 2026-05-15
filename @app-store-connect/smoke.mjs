import assert from 'node:assert/strict';
import { plugin, contract } from './api-emulator.mjs';

const routes = new Map();
const data = new Map();
const app = {
  get: (path, handler) => routes.set(`GET ${path}`, handler),
  post: (path, handler) => routes.set(`POST ${path}`, handler),
  patch: (path, handler) => routes.set(`PATCH ${path}`, handler),
  put: (path, handler) => routes.set(`PUT ${path}`, handler),
  delete: (path, handler) => routes.set(`DELETE ${path}`, handler),
};
const store = {
  getData: (key) => data.get(key),
  setData: (key, value) => data.set(key, value),
  collection: (key) => ({
    all: () => data.get(key) ?? [],
    insert: (value) => {
      const items = data.get(key) ?? [];
      const item = { ...value, id: crypto.randomUUID() };
      data.set(key, [...items, item]);
      return item;
    },
    findOneBy: (field, value) => (data.get(key) ?? []).find((item) => item[field] === value) ?? null,
    update: (id, updates) => {
      const items = data.get(key) ?? [];
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return null;
      const updated = { ...items[index], ...updates };
      items[index] = updated;
      data.set(key, items);
      return updated;
    },
    delete: (id) => {
      data.set(key, (data.get(key) ?? []).filter((item) => item.id !== id));
    },
  }),
};

plugin.seed?.(store, 'http://app-store-connect.test');
plugin.register(app, store, undefined, 'http://app-store-connect.test');

async function call(method, path, body = {}, params = {}, query = {}) {
  const handler = routes.get(`${method} ${path}`);
  assert.ok(handler, `missing route ${method} ${path}`);
  let status = 200;
  let payload;
  await handler({
    req: {
      method,
      path,
      url: `http://app-store-connect.test${path}`,
      json: async () => body,
      arrayBuffer: async () => Buffer.from(body?.raw ?? ''),
      header: () => undefined,
      param: (name) => params[name],
      query: (name) => query[name],
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
    header: () => {},
  });
  return { status, payload };
}

assert.equal(contract.provider, 'app-store-connect');
assert.deepEqual(contract.scope.every((capability) => capability.startsWith('asc-')), true);
assert.equal(routes.has('GET /auth/authorize'), false);
assert.equal(routes.has('POST /3/device/:token'), false);
assert.equal(routes.has('GET /database/1/:container/:environment/:database/users/current'), false);

const apps = await call('GET', '/v1/apps');
assert.equal(apps.payload.data[0].id, '1234567890');
assert.equal(apps.payload.data[0].attributes.bundleId, 'com.example.app');

const version = await call('POST', '/v1/appStoreVersions', {
  data: {
    type: 'appStoreVersions',
    attributes: { versionString: '2.0.0', platform: 'IOS' },
    relationships: { app: { data: { type: 'apps', id: '1234567890' } } },
  },
});
assert.equal(version.status, 201);

const inspect = await call('GET', '/inspect/asc/state');
assert.equal(Object.keys(inspect.payload.versions).length, 1);

console.log('app-store-connect smoke ok');
