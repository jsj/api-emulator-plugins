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

function findRoute(method, path) {
  const route = registered.find((item) => item.method === method && match(item.path, path));
  assert.ok(route, `${method} ${path} route should exist`);
  return route;
}

async function request(method, path, body, headers = {}) {
  const url = new URL(path, 'http://truemed.local');
  const route = findRoute(method, url.pathname);
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

const auth = { 'x-truemed-api-key': 'trm_sk_emulator' };

assert.equal(contract.provider, 'truemed');
assert.equal(contract.coverage.routeCount, routes.length);
for (const route of routes) {
  findRoute(route.method, route.path.replace(':businessId', 'ps_emulator')
    .replace(':paymentToken', 'pt_emulator')
    .replace(':provisionTokenRequestId', 'ptr_emulator')
    .replace(':qualificationSessionId', 'qs_emulator'));
}

const unauth = await request('GET', '/payments/v1/payment_sessions');
assert.equal(unauth.status, 401);

const created = await request('POST', '/payments/v1/create_payment_session', {
  total_amount: 4200,
  success_url: 'https://example.test/success/{{payment_session_id}}',
  failure_url: 'https://example.test/failure/{{payment_session_id}}',
  customer_email: 'customer@example.test',
  customer_name: 'Customer Example',
  tokenize: true,
  order_items: [{ sku: 'THERAPY-MAT', name: 'Therapy Mat', price: 4200, quantity: 1 }],
}, auth);
assert.equal(created.status, 200);
assert.match(created.payload.id, /^ps_/);
assert.match(created.payload.redirect_url, /\/truemed\/checkout\/ps_/);

const detail = await request('GET', `/payments/v1/payment_session/${created.payload.id}`, undefined, auth);
assert.equal(detail.payload.customer_email, 'customer@example.test');

const list = await request('GET', '/payments/v1/payment_sessions?search=customer%40example.test', undefined, auth);
assert.ok(list.payload.payment_sessions.some((session) => session.id === created.payload.id));

const captured = await request('POST', `/payments/v1/payment_session/${created.payload.id}/capture`, { total_amount: 4200 }, auth);
assert.equal(captured.payload.capture_amount, 4200);

const refund = await request('POST', '/payments/v1/refund', { payment_session_id: created.payload.id, amount: 1000 }, auth);
assert.equal(refund.payload.status, 'succeeded');

const token = await request('POST', '/api/v1/payment_tokens/create', { customer_email: 'token@example.test' }, auth);
assert.equal(token.status, 201);
assert.match(token.payload.payment_token, /^pt_/);

const tokenDetail = await request('GET', `/api/v1/payment_tokens/${token.payload.payment_token}`, undefined, auth);
assert.equal(tokenDetail.payload.customer_email, 'token@example.test');

const tokenList = await request('GET', '/api/v1/payment_tokens', undefined, auth);
assert.ok(tokenList.payload.payment_tokens.length >= 1);

const tokenUpdate = await request('POST', `/api/v1/payment_tokens/${token.payload.payment_token}/update`, { metadata: 'updated' }, auth);
assert.equal(tokenUpdate.payload.metadata, 'updated');

const provision = await request('GET', '/api/v1/payment_tokens/provision_request/ptr_emulator', undefined, auth);
assert.equal(provision.payload.status, 'completed');

const qualification = await request('GET', '/api/v1/qualification_session/qs_emulator', undefined, auth);
assert.equal(qualification.payload.status, 'qualified');

const qualifications = await request('GET', '/api/v1/qualification_sessions', undefined, auth);
assert.equal(qualifications.payload.qualification_sessions[0].qualification_session_id, 'qs_emulator');

const checkoutMethod = await request('POST', '/api/v1/product_catalog/truemed_checkout_method', { items: [{ sku: 'THERAPY-MAT' }] }, auth);
assert.equal(checkoutMethod.payload.checkout_method, 'truemed');

const catalogCreate = await request('POST', '/api/v1/product_catalog/items/create', {
  sku: 'RECOVERY-BAND',
  name: 'Recovery Band',
  description: 'Recovery support band',
  image_urls: ['https://example.test/recovery-band.png'],
  url: 'https://example.test/products/recovery-band',
}, auth);
assert.equal(catalogCreate.status, 201);

const catalogUpdate = await request('POST', '/api/v1/product_catalog/items/update', { sku: 'RECOVERY-BAND', eligibility: 'eligible' }, auth);
assert.equal(catalogUpdate.status, 200);

const catalogDetail = await request('POST', '/api/v1/product_catalog/items/detail', { sku: 'RECOVERY-BAND' }, auth);
assert.equal(catalogDetail.payload.object.eligibility, 'eligible');

const deleted = await request('POST', `/api/v1/payment_tokens/${token.payload.payment_token}/delete`, {}, auth);
assert.deepEqual(deleted.payload, {});

console.log('truemed smoke ok');
