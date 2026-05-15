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
  const url = new URL(path, 'http://coderabbit.local');
  const route = routes.find((item) => item.method === method && match(item.path, url.pathname));
  assert.ok(route, `${method} ${path} route should exist`);
  let status = 200;
  let payload;
  await route.handler({
    req: { query: (name) => url.searchParams.get(name) ?? undefined, json: async () => body ?? {} },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

assert.equal(contract.provider, 'coderabbit');

const users = await request('GET', '/v1/users');
assert.equal(users.payload.data.length, 2);

const seats = await request('POST', '/v1/users/seats', { emails: ['reviewer@example.com'], seat_status: 'inactive' });
assert.equal(seats.payload.data[0].seat_status, 'inactive');

const roles = await request('POST', '/v1/users/roles', { emails: ['reviewer@example.com'], role: 'admin' });
assert.equal(roles.payload.data[0].role, 'admin');

const metrics = await request('GET', '/v1/metrics/reviews?repository=github.com/example/repo');
assert.equal(metrics.payload.data[0].repository, 'github.com/example/repo');

const audit = await request('GET', '/v1/audit-logs');
assert.ok(audit.payload.data.length >= 3);

console.log('coderabbit smoke ok');
