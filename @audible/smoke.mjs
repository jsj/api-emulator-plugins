import assert from 'node:assert/strict';
import { contract, initConfig, plugin } from './api-emulator.mjs';

const routes = [];
const data = new Map();
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  delete: (path, handler) => routes.push({ method: 'DELETE', path, handler }),
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
  const url = new URL(`http://audible.local${path}`);
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
    body: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

assert.equal(contract.provider, 'audible');
assert.equal(initConfig.audible.marketplace, 'us');

const products = await request('GET', '/1.0/catalog/products?keywords=localhost&num_results=1');
assert.equal(products.payload.products.items[0].asin, 'B0EMU00001');

const detail = await request('GET', '/1.0/catalog/products/B0EMU00001');
assert.equal(detail.payload.product.title, 'Localhost Listening');

const reviews = await request('GET', '/1.0/catalog/products/B0EMU00001/reviews');
assert.equal(reviews.payload.reviews.items[0].headline, 'Great local fixture');

const library = await request('GET', '/1.0/library');
assert.equal(library.payload.items.items[0].asin, 'B0EMU00001');

const added = await request('POST', '/1.0/wishlist', { asin: 'B0EMU00001' });
assert.equal(added.status, 201);

await request('DELETE', '/1.0/wishlist/B0EMU00002');
const wishlist = await request('GET', '/1.0/wishlist');
assert.equal(wishlist.payload.items.items.every((item) => item.asin !== 'B0EMU00002'), true);

console.log('audible smoke ok');
