import assert from 'node:assert/strict';
import { plugin, contract, routes } from './api-emulator.mjs';

const registered = [];
const data = new Map();
const app = {
  get: (path, handler) => registered.push({ method: 'GET', path, handler }),
  post: (path, handler) => registered.push({ method: 'POST', path, handler }),
  put: (path, handler) => registered.push({ method: 'PUT', path, handler }),
};
const store = {
  getData: (key) => data.get(key),
  setData: (key, value) => data.set(key, value),
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

function routePath(path) {
  return path
    .replace(':deviceId', 'dev_emulator')
    .replace(':userId', 'usr_emulator')
    .replace(':sessionId', 'session_emulator');
}

function findRoute(method, path) {
  assert.ok(registered.find((item) => item.method === method && match(item.path, routePath(path))), `${method} ${path} route should exist`);
}

async function request(method, path, body, headers = {}) {
  const url = new URL(path, 'http://eight-sleep.local');
  const route = registered.find((item) => item.method === method && match(item.path, url.pathname));
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, url.pathname);
  let status = 200;
  let payload;
  await route.handler({
    req: {
      url: url.toString(),
      param: (name) => params[name],
      query: (name) => url.searchParams.get(name) ?? undefined,
      header: (name) => headers[name.toLowerCase()],
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

assert.equal(contract.provider, 'eight-sleep');
assert.equal(contract.coverage.routeCount, routes.length);
for (const route of routes) findRoute(route.method, route.path);

const unauthorized = await request('GET', '/v1/users/me');
assert.equal(unauthorized.status, 401);

const token = await request('POST', '/v1/tokens', { grant_type: 'password', username: 'sleeper@example.test', password: 'dummy' });
assert.equal(token.payload.access_token, 'eight_sleep_emulator_token');
const auth = { authorization: `Bearer ${token.payload.access_token}` };

const login = await request('POST', '/v1/login', { email: 'sleeper@example.test', password: 'dummy' });
assert.equal(login.payload.session.token, 'eight_sleep_emulator_token');

const me = await request('GET', '/v1/users/me', undefined, auth);
assert.equal(me.payload.user.currentDevice, 'dev_emulator');

const device = await request('GET', '/v1/devices/dev_emulator?filter=ownerId,leftUserId,rightUserId', undefined, auth);
assert.equal(device.payload.result.ownerId, 'usr_emulator');

const trends = await request('GET', '/v1/users/usr_emulator/trends?from=2026-05-15&to=2026-05-15&tz=America/Los_Angeles', undefined, auth);
assert.equal(trends.payload.days[0].sleepScore, 92);

const intervals = await request('GET', '/v1/users/usr_emulator/intervals/session_emulator', undefined, auth);
assert.equal(intervals.payload.intervals[0].stage, 'awake');

const temperature = await request('GET', '/v1/users/usr_emulator/temperature', undefined, auth);
assert.equal(temperature.payload.result.targetLevel, -2);

const updated = await request('PUT', '/v1/users/usr_emulator/temperature', { targetLevel: -3, heating: true }, auth);
assert.equal(updated.payload.result.targetLevel, -3);
assert.equal(updated.payload.result.heating, true);

console.log('eight-sleep smoke ok');
