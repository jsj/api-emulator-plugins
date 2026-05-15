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

const me = await request('GET', '/v1/me');
assert.equal(me.payload.email, 'emulator@example.com');
const employees = await request('GET', '/v1/companies/company_1/employees');
assert.equal(employees.payload[0].uuid, 'employee_1');
const created = await request('POST', '/v1/companies/company_1/employees', { first_name: 'Grace', last_name: 'Hopper', email: 'grace@example.com' });
assert.equal(created.payload.company_uuid, 'company_1');

console.log('gusto smoke ok');
