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
      queries: (name) => url.searchParams.getAll(name),
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

const token = await request('GET', '/oauth/v1/access-tokens/pat-emulator');
assert.equal(token.payload.hub_id, 123456);

const contacts = await request('GET', '/crm/v3/objects/contacts?properties=email&properties=firstname');
assert.equal(contacts.payload.results[0].properties.email, 'ada@example.com');

const created = await request('POST', '/crm/v3/objects/contacts', { properties: { email: 'grace@example.com', firstname: 'Grace', lastname: 'Hopper' } });
assert.equal(created.status, 201);

const fetched = await request('GET', `/crm/v3/objects/contacts/${created.payload.id}`);
assert.equal(fetched.payload.properties.firstname, 'Grace');

const search = await request('POST', '/crm/v3/objects/contacts/search', { query: 'grace' });
assert.equal(search.payload.total, 1);

const properties = await request('GET', '/crm/v3/properties/contacts');
assert.ok(properties.payload.results.some((property) => property.name === 'email'));

const hubdb = await request('GET', '/cms/v3/hubdb/tables');
assert.equal(hubdb.payload.results[0].name, 'emulator_table');

console.log('hubspot smoke ok');
