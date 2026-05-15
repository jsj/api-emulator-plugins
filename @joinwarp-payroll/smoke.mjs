import assert from 'node:assert/strict';
import { plugin } from './api-emulator.mjs';

const routes = [];
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  put: (path, handler) => routes.push({ method: 'PUT', path, handler }),
  patch: (path, handler) => routes.push({ method: 'PATCH', path, handler }),
  delete: (path, handler) => routes.push({ method: 'DELETE', path, handler }),
};
const store = { data: new Map(), getData(key) { return this.data.get(key); }, setData(key, value) { this.data.set(key, value); } };
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
  let status = 200; let payload;
  await route.handler({
    req: { url: url.toString(), param: (name) => params[name], query: (name) => url.searchParams.get(name) ?? undefined, json: async () => body ?? {} },
    json: (value, nextStatus = 200) => { status = nextStatus; payload = value; return { status, payload }; },
  });
  return { status, payload };
}

const workers = await request('GET', '/v1/workers?limit=10');
assert.equal(workers.status, 200);
assert.equal(workers.payload.data[0].email, 'ada@example.com');
assert.equal(workers.payload.hasMore, false);

const created = await request('POST', '/v1/workers/employee', { firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com', departmentId: 'dept_1' });
assert.equal(created.status, 201);
assert.equal(created.payload.type, 'employee');

const department = await request('PATCH', '/v1/departments/dept_1', { name: 'Platform Engineering' });
assert.equal(department.payload.name, 'Platform Engineering');

const invite = await request('POST', `/v1/workers/${created.payload.id}/invite`);
assert.equal(invite.status, 201);
assert.equal(invite.payload.status, 'sent');

const policies = await request('GET', '/v1/time_off/policies');
assert.equal(policies.payload.data[0].name, 'Paid Time Off');

console.log('joinwarp-payroll smoke ok');
