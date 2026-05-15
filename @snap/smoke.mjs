import assert from 'node:assert/strict';
import { plugin, contract } from './api-emulator.mjs';

const routes = [];
const data = new Map();
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  put: (path, handler) => routes.push({ method: 'PUT', path, handler }),
  patch: (path, handler) => routes.push({ method: 'PATCH', path, handler }),
  delete: (path, handler) => routes.push({ method: 'DELETE', path, handler }),
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

async function request(method, path, body) {
  const url = new URL(`http://snap.local${path}`);
  const route = routes.find((item) => item.method === method && match(item.path, url.pathname));
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, url.pathname);
  let status = 200;
  let payload;
  await route.handler({
    req: {
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

assert.equal(contract.provider, 'snap');

const token = await request('POST', '/login/oauth2/access_token');
assert.equal(token.payload.access_token, 'snap_emulator_access_token');

const orgs = await request('GET', '/v1/me/organizations');
assert.equal(orgs.payload.organizations[0].id, 'snap_org_seed');

const accounts = await request('GET', '/v1/organizations/snap_org_seed/adaccounts');
assert.equal(accounts.payload.adaccounts[0].id, 'snap_adaccount_seed');

const campaigns = await request('GET', '/v1/adaccounts/snap_adaccount_seed/campaigns');
assert.equal(campaigns.payload.campaigns[0].id, 'snap_campaign_seed');

const stats = await request('GET', '/v1/campaigns/snap_campaign_seed/stats');
assert.equal(stats.payload.timeseries_stats[0].stats.swipes, 840);

console.log('snap smoke ok');
