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

async function request(path) {
  const url = new URL(`http://applovin.local${path}`);
  const route = routes.find((item) => item.method === 'GET' && item.path === url.pathname);
  assert.ok(route, `GET ${path} route should exist`);
  let status = 200;
  let payload;
  await route.handler({
    req: {
      query: (name) => url.searchParams.get(name) ?? undefined,
      json: async () => ({}),
    },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
    text: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

assert.equal(contract.provider, 'applovin');

const report = await request('/report?api_key=applovin_emulator_key&start=2026-05-15&end=2026-05-15&format=json&columns=day,campaign,impressions,clicks,cost');
assert.equal(report.payload.results[0].campaign, 'AppLovin Emulator Campaign');
assert.equal(report.payload.results[0].cost, '321.45');

const maxReport = await request('/maxReport?api_key=applovin_emulator_key&start=2026-05-15&end=2026-05-15&format=json&columns=day,application,revenue');
assert.equal(maxReport.payload.results[0].revenue, '654.32');

const csv = await request('/report?api_key=applovin_emulator_key&format=csv&columns=day,campaign');
assert.match(csv.payload, /AppLovin Emulator Campaign/);

console.log('applovin smoke ok');
