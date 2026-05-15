import assert from 'node:assert/strict';
import { contract, initConfig, plugin } from './api-emulator.mjs';

const routes = [];
const data = new Map();
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
};
const store = { getData: (key) => data.get(key), setData: (key, value) => data.set(key, value) };

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
  const url = new URL(`http://nextdoor.local${path}`);
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
      header: () => 'application/json',
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

assert.equal(contract.provider, 'nextdoor');
assert.equal(initConfig.nextdoor.profileId, 'nd_profile_home');

const me = await request('GET', '/me');
assert.equal(me.payload.data.display_name, 'Local Neighbor');

const profiles = await request('GET', '/me/profiles');
assert.equal(profiles.payload.data[0].neighborhood_name, 'Emulator Heights');

const created = await request('POST', '/posts', {
  profile_id: 'nd_profile_home',
  subject: 'Smoke Sale',
  body: 'Bike available for local pickup.',
});
assert.equal(created.status, 201);
assert.match(created.payload.data.id, /^nd_post_/);

const search = await request('GET', '/search-posts?q=bike');
assert.equal(search.payload.data[0].subject, 'Smoke Sale');

const business = await request('GET', '/search-businesses?q=hardware');
assert.equal(business.payload.data[0].name, 'Localhost Hardware');

console.log('nextdoor smoke ok');
