import assert from 'node:assert/strict';
import { plugin, contract, routes } from './api-emulator.mjs';

const registered = [];
const data = new Map();
const app = {
  get: (path, handler) => registered.push({ method: 'GET', path, handler }),
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

function findRoute(method, path) {
  assert.ok(registered.find((item) => item.method === method && match(item.path, path)), `${method} ${path} route should exist`);
}

async function request(method, path, headers = {}) {
  const url = new URL(path, 'http://oura.local');
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
    },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

assert.equal(contract.provider, 'oura');
assert.equal(contract.coverage.routeCount, routes.length);
for (const route of routes) findRoute(route.method, route.path);

const unauthorized = await request('GET', '/v2/usercollection/personal_info');
assert.equal(unauthorized.status, 401);

const auth = { authorization: 'Bearer oura_emulator_token' };
const personal = await request('GET', '/v2/usercollection/personal_info', auth);
assert.equal(personal.payload.email, 'ring@example.test');

const dailySleep = await request('GET', '/v2/usercollection/daily_sleep?start_date=2026-05-15&end_date=2026-05-15', auth);
assert.equal(dailySleep.payload.data[0].score, 91);
assert.equal(dailySleep.payload.next_token, null);

const sleep = await request('GET', '/v2/usercollection/sleep', auth);
assert.equal(sleep.payload.data[0].type, 'long_sleep');

const readiness = await request('GET', '/v2/usercollection/daily_readiness', auth);
assert.equal(readiness.payload.data[0].score, 87);

const activity = await request('GET', '/v2/usercollection/daily_activity', auth);
assert.equal(activity.payload.data[0].steps, 10420);

const workout = await request('GET', '/v2/usercollection/workout', auth);
assert.equal(workout.payload.data[0].activity, 'running');

const heartrate = await request('GET', '/v2/usercollection/heartrate', auth);
assert.equal(heartrate.payload.data[0].bpm, 62);

const sandbox = await request('GET', '/v2/sandbox/usercollection/daily_sleep');
assert.equal(sandbox.payload.data[0].id, 'daily_sleep_emulator');

console.log('oura smoke ok');
