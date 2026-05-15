import assert from 'node:assert/strict';
import { plugin } from './api-emulator.mjs';

const routes = [];
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  put: (path, handler) => routes.push({ method: 'PUT', path, handler }),
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
  const route = routes.find((item) => item.method === method && match(item.path, path));
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, path);
  let status = 200;
  let payload;
  await route.handler({
    req: {
      param: (name) => params[name],
      query: () => undefined,
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

const edit = await request('POST', '/androidpublisher/v3/applications/com.example.app/edits');
assert.equal(edit.status, 200);
const tracks = await request('GET', `/androidpublisher/v3/applications/com.example.app/edits/${edit.payload.id}/tracks`);
assert.equal(tracks.payload.tracks[0].track, 'production');
const reviews = await request('GET', '/androidpublisher/v3/applications/com.example.app/reviews');
assert.equal(reviews.payload.reviews[0].reviewId, 'review_cli_smoke');
const products = await request('GET', '/androidpublisher/v3/applications/com.example.app/inappproducts');
assert.equal(products.payload.inappproduct[0].sku, 'coins_100');
const vitals = await request('GET', '/v1beta1/apps/com.example.app/errorIssues:search');
assert.match(vitals.payload.errorIssues[0].name, /error_cli_smoke/);

console.log('google play smoke ok');
