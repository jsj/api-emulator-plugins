import assert from 'node:assert/strict';
import { plugin } from './api-emulator.mjs';

const routes = [];
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  patch: (path, handler) => routes.push({ method: 'PATCH', path, handler }),
  put: (path, handler) => routes.push({ method: 'PUT', path, handler }),
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

const incidents = await request('GET', '/api/now/table/incident?sysparm_limit=5');
assert.equal(incidents.payload.result[0].number, 'INC0010001');

const created = await request('POST', '/api/now/table/incident', { short_description: 'CLI smoke customer issue', state: '1' });
assert.equal(created.status, 201);
assert.match(created.payload.result.number, /^INC/);

const fetched = await request('GET', `/api/now/table/incident/${created.payload.result.sys_id}?sysparm_fields=number,state`);
assert.deepEqual(Object.keys(fetched.payload.result), ['number', 'state']);

const updated = await request('PATCH', `/api/now/table/incident/${created.payload.result.sys_id}`, { state: '2' });
assert.equal(updated.payload.result.state, '2');

const users = await request('GET', '/api/now/table/sys_user?sysparm_query=user_name=ada.lovelace');
assert.equal(users.payload.result[0].email, 'ada@example.com');

console.log('servicenow smoke ok');
