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
  const requestUrl = new URL(path, 'http://127.0.0.1');
  const route = routes.find((item) => item.method === method && match(item.path, requestUrl.pathname));
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, requestUrl.pathname);
  let status = 200;
  let payload;
  await route.handler({
    req: {
      url: requestUrl.toString(),
      param: (name) => params[name],
      query: (name) => requestUrl.searchParams.get(name) ?? undefined,
      json: async () => body ?? {},
    },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
    body: (_value, nextStatus = 200) => {
      status = nextStatus;
      payload = null;
      return { status, payload };
    },
  });
  return { status, payload };
}

const userinfo = await request('GET', '/services/oauth2/userinfo');
assert.equal(userinfo.payload.preferred_username, 'emulator@example.com');

const limits = await request('GET', '/services/data/v64.0/limits');
assert.equal(limits.payload.DailyApiRequests.Remaining, 14999);

const query = await request('GET', `/services/data/v64.0/query?q=${encodeURIComponent('SELECT Id, Name FROM Account')}`);
assert.equal(query.payload.records[0].Name, 'Emulator Account');

const created = await request('POST', '/services/data/v64.0/sobjects/Account', { Name: 'CLI Smoke Account', Website: 'https://example.test' });
assert.equal(created.status, 201);
assert.equal(created.payload.success, true);

const account = await request('GET', `/services/data/v64.0/sobjects/Account/${created.payload.id}`);
assert.equal(account.payload.Name, 'CLI Smoke Account');

const described = await request('GET', '/services/data/v64.0/sobjects/Account/describe');
assert.equal(described.payload.name, 'Account');

console.log('salesforce smoke ok');
