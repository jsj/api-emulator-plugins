import assert from 'node:assert/strict';
import { plugin } from './api-emulator.mjs';

const routes = [];
const data = new Map();
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  patch: (path, handler) => routes.push({ method: 'PATCH', path, handler }),
  put: (path, handler) => routes.push({ method: 'PUT', path, handler }),
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
  const route = routes.find((item) => item.method === method && match(item.path, path));
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, path);
  let status = 200;
  let payload;
  await route.handler({
    req: { param: (name) => params[name], json: async () => body ?? {} },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

const products = await request('GET', '/v1/products');
assert.equal(products.payload.products[0].product_id, 'uberx');

const ride = await request('POST', '/v1.2/requests', { product_id: 'uberx', start_latitude: 37.77, start_longitude: -122.41 });
assert.equal(ride.status, 202);
assert.match(ride.payload.request_id, /^request_/);

const quote = await request('POST', '/v1/customers/customer_emulator/delivery_quotes', { pickup_address: '1 Market St', dropoff_address: '500 Howard St' });
assert.equal(quote.payload.fee, 699);

const delivery = await request('POST', '/v1/customers/customer_emulator/deliveries', { pickup_address: '1 Market St', dropoff_address: '500 Howard St' });
assert.match(delivery.payload.tracking_url, /delivery\.uber\.com/);

const proof = await request('GET', `/v1/customers/customer_emulator/deliveries/${delivery.payload.id}/proof-of-delivery`);
assert.match(proof.payload.photo_url, /photo_emulator/);

const menu = await request('GET', '/eats/stores/store_emulator/menus');
assert.equal(menu.payload.items[0].id, 'item_burger');

const history = await request('GET', '/v1.2/history');
assert.equal(history.payload.count, 1);

const stores = await request('GET', '/eats/stores');
assert.equal(stores.payload.stores[0].id, 'store_emulator');

const report = await request('POST', '/eats/report', { report_type: 'orders' });
assert.equal(report.status, 202);

console.log('uber smoke ok');
