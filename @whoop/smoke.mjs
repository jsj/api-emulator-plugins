import assert from 'node:assert/strict';
import { plugin, contract, routes } from './api-emulator.mjs';

const registered = [];
const data = new Map();
const app = {
  get: (path, handler) => registered.push({ method: 'GET', path, handler }),
  post: (path, handler) => registered.push({ method: 'POST', path, handler }),
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

async function request(method, path, body, headers = {}) {
  const url = new URL(path, 'http://whoop.local');
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

assert.equal(contract.provider, 'whoop');
assert.equal(contract.coverage.routeCount, routes.length);
for (const route of routes) findRoute(route.method, route.path);

function findRoute(method, path) {
  const resolved = path.replace(':deviceId', 'dev_emulator');
  assert.ok(registered.find((item) => item.method === method && match(item.path, resolved)), `${method} ${path} route should exist`);
}

const unauthorized = await request('GET', '/developer/v2/user/profile/basic');
assert.equal(unauthorized.status, 401);

const token = await request('POST', '/oauth/oauth2/token', { grant_type: 'authorization_code' });
assert.equal(token.payload.access_token, 'whoop_emulator_token');
const auth = { authorization: `Bearer ${token.payload.access_token}` };

const profile = await request('GET', '/developer/v2/user/profile/basic', undefined, auth);
assert.equal(profile.payload.email, 'athlete@example.test');

const body = await request('GET', '/developer/v2/user/measurement/body', undefined, auth);
assert.equal(body.payload.max_heart_rate, 188);

const cycles = await request('GET', '/developer/v2/cycle?limit=1', undefined, auth);
assert.equal(cycles.payload.records[0].score_state, 'SCORED');

const recovery = await request('GET', '/developer/v2/recovery', undefined, auth);
assert.equal(recovery.payload.records[0].score.recovery_score, 86);

const sleep = await request('GET', '/developer/v2/activity/sleep', undefined, auth);
assert.equal(sleep.payload.records[0].nap, false);

const workout = await request('GET', '/developer/v2/activity/workout', undefined, auth);
assert.equal(workout.payload.records[0].score.distance_meter, 6200);

console.log('whoop smoke ok');
