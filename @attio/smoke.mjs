import assert from 'node:assert/strict';
import { plugin } from './api-emulator.mjs';

const routes = [];
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  patch: (path, handler) => routes.push({ method: 'PATCH', path, handler }),
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

const self = await request('GET', '/v2/self');
assert.equal(self.payload.data.workspace.slug, 'emulator');

const objects = await request('GET', '/v2/objects');
assert.ok(objects.payload.data.some((object) => object.api_slug === 'people'));

const people = await request('POST', '/v2/objects/people/records/query', { query: 'ada' });
assert.equal(people.payload.data[0].id.record_id, 'record_person_1');

const created = await request('POST', '/v2/objects/people/records', { data: { values: { name: [{ value: 'Grace Hopper' }], email_addresses: [{ email_address: 'grace@example.com' }] } } });
assert.equal(created.status, 201);

const fetched = await request('GET', `/v2/objects/people/records/${created.payload.data.id.record_id}`);
assert.equal(fetched.payload.data.values.name[0].value, 'Grace Hopper');

const updated = await request('PATCH', `/v2/objects/people/records/${created.payload.data.id.record_id}`, { data: { values: { job_title: [{ value: 'Rear Admiral' }] } } });
assert.equal(updated.payload.data.values.job_title[0].value, 'Rear Admiral');

const lists = await request('GET', '/v2/lists');
assert.equal(lists.payload.data[0].api_slug, 'emulator-list');

console.log('attio smoke ok');
