import assert from 'node:assert/strict';
import { plugin } from './api-emulator.mjs';

const routes = [];
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  put: (path, handler) => routes.push({ method: 'PUT', path, handler }),
  patch: (path, handler) => routes.push({ method: 'PATCH', path, handler }),
  delete: (path, handler) => routes.push({ method: 'DELETE', path, handler }),
};
const store = { data: new Map(), getData(key) { return this.data.get(key); }, setData(key, value) { this.data.set(key, value); } };
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
  let status = 200; let payload;
  await route.handler({
    req: { url: url.toString(), param: (name) => params[name], query: (name) => url.searchParams.get(name) ?? undefined, json: async () => body ?? {} },
    json: (value, nextStatus = 200) => { status = nextStatus; payload = value; return { status, payload }; },
  });
  return { status, payload };
}

const users = await request('GET', '/developer/v1/users');
assert.equal(users.payload.data[0].email, 'ada@example.com');
const txns = await request('GET', '/developer/v1/transactions');
assert.equal(txns.payload.data[0].merchant_name, 'Emulator Cafe');
const reimb = await request('POST', '/developer/v1/reimbursements', { amount: 1250, currency: 'USD', memo: 'Mileage' });
assert.equal(reimb.status, 201);
assert.equal(reimb.payload.amount, 1250);
const me = await request('POST', '/developer/v1/agent-tools/get-simplified-user-detail', {});
assert.equal(me.payload.email, 'ada@example.com');
const cliTransactions = await request('POST', '/developer/v1/agent-tools/get-transactions', { transactions_to_retrieve: 'my_transactions' });
assert.equal(cliTransactions.payload.transactions[0].merchant_name, 'Emulator Cafe');
const cliTransaction = await request('POST', '/developer/v1/agent-tools/get-full-transaction-metadata', { id: 'txn_1' });
assert.equal(cliTransaction.payload.transaction_uuid, 'txn_1');
const cliReimbursements = await request('POST', '/developer/v1/agent-tools/get-reimbursements', {});
assert.equal(cliReimbursements.payload.reimbursements[0].memo, 'Mileage');

console.log('ramp smoke ok');
