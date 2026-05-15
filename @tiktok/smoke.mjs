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
  const url = new URL(`http://tiktok.local${path}`);
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

assert.equal(contract.provider, 'tiktok');

const advertiser = await request('GET', '/open_api/v1.3/advertiser/info/?advertiser_ids=%5B%227000000000000%22%5D');
assert.equal(advertiser.payload.data.list[0].advertiser_id, '7000000000000');

const campaigns = await request('GET', '/open_api/v1.3/campaign/get/?advertiser_id=7000000000000&page=1&page_size=100');
assert.equal(campaigns.payload.code, 0);
assert.equal(campaigns.payload.data.list[0].campaign_id, 'tiktok_campaign_seed');

const adgroups = await request('GET', '/open_api/v1.3/adgroup/get/?advertiser_id=7000000000000');
assert.equal(adgroups.payload.data.list[0].campaign_id, 'tiktok_campaign_seed');

const ads = await request('GET', '/open_api/v1.3/ad/get/?advertiser_id=7000000000000');
assert.equal(ads.payload.data.list[0].ad_id, 'tiktok_ad_1');

const report = await request('GET', '/open_api/v1.3/report/integrated/get/?advertiser_id=7000000000000&dimensions=%5B%22campaign_id%22%5D&metrics=%5B%22spend%22%2C%22clicks%22%5D');
assert.equal(report.payload.data.list[0].metrics.spend, '321.45');

const task = await request('POST', '/open_api/v1.3/report/task/create/', { advertiser_id: '7000000000000' });
assert.match(task.payload.data.task_id, /tiktok_report_task_/);

console.log('tiktok smoke ok');
