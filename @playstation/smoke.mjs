import assert from 'node:assert/strict';
import { contract, plugin } from './api-emulator.mjs';

const routes = [];
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
};
const store = {
  data: new Map(),
  getData(key) {
    return this.data.get(key);
  },
  setData(key, value) {
    this.data.set(key, value);
  },
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
  const url = new URL(path, 'http://127.0.0.1');
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

assert.equal(contract.provider, 'playstation');
const conceptCount = await request('GET', '/api/v1/concepts/count');
assert.equal(conceptCount.payload.count, 1);
const concepts = await request('GET', '/api/v1/concepts?offset=0&limit=1');
assert.equal(concepts.payload.items[0].conceptId, 'concept_seed');
const products = await request('GET', '/api/v1/concepts/concept_seed/products');
assert.equal(products.payload.items[0].productId, 'PPSA00001_00');
const variant = await request('POST', '/api/v1/create/concepts/products/variant', { productId: 'PPSA00001_00', variantId: 'variant_smoke' });
assert.equal(variant.status, 201);
const metadata = await request('POST', '/api/v1/create/concepts/products/variant/metadata', {
  productId: 'PPSA00001_00',
  variantId: 'variant_smoke',
  metadata: { title: 'Smoke Metadata' },
});
assert.equal(metadata.payload.metadata.title, 'Smoke Metadata');
const preview = await request('GET', '/api/v1/concepts/concept_seed/products/PPSA00001_00/variant/variant_smoke/preview');
assert.match(preview.payload.previewUrl, /variant_smoke/);
const assets = await request('GET', '/api/v1/assets');
assert.equal(assets.payload.items[0].assetId, 'asset_seed');
const publish = await request('POST', '/api/v1/contentservice/publish?env=qa', { productId: 'PPSA00001_00' });
assert.equal(publish.status, 202);
assert.equal(publish.payload.environment, 'qa');
const history = await request('GET', '/api/v1/publishHistory');
assert.equal(history.payload.items[0].publishId, publish.payload.publishId);

console.log('playstation smoke ok');
