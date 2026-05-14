import assert from 'node:assert/strict';
import { plugin, contract } from './api-emulator/src/index.ts';

function createCollection() {
  let nextId = 1;
  const rows = [];
  return {
    all: () => rows,
    insert(data) {
      const now = new Date().toISOString();
      const row = { id: nextId++, created_at: now, updated_at: now, ...data };
      rows.push(row);
      return row;
    },
    update(id, data) {
      const row = rows.find((item) => item.id === id);
      if (!row) return undefined;
      Object.assign(row, data, { updated_at: new Date().toISOString() });
      return row;
    },
    clear: () => rows.splice(0, rows.length),
    findOneBy: (field, value) => rows.find((item) => item[field] === value),
  };
}

function createHarness() {
  const routes = new Map();
  const collections = new Map();
  const app = {
    use: () => undefined,
    get: (path, handler) => routes.set(`GET ${path}`, handler),
    post: (path, handler) => routes.set(`POST ${path}`, handler),
    put: (path, handler) => routes.set(`PUT ${path}`, handler),
    patch: (path, handler) => routes.set(`PATCH ${path}`, handler),
    delete: (path, handler) => routes.set(`DELETE ${path}`, handler),
  };
  const store = {
    collection(name) {
      if (!collections.has(name)) collections.set(name, createCollection());
      return collections.get(name);
    },
  };
  plugin.seed(store);
  plugin.register(app, store);
  return {
    async call(method, path, body = {}, params = {}) {
      const handler = routes.get(`${method} ${path}`) ?? routes.get(`${method} *`) ?? routes.get(`${method} /*`);
      assert.ok(handler, `missing route ${method} ${path}`);
      let status = 200;
      let payload;
      await handler({
        req: {
          json: async () => body,
          param: (name) => params[name] ?? (name === '*' ? path : undefined),
          query: () => undefined,
          header: () => 'plaid-emulator-secret',
        },
        json: (value, nextStatus = 200) => {
          status = nextStatus;
          payload = value;
          return { status, payload };
        },
      });
      return { status, payload };
    },
  };
}

const harness = createHarness();
assert.equal(contract.provider, 'plaid');
assert.equal(contract.openapiRouteCount, 330);

const link = await harness.call('POST', '/link/token/create', {
  client_name: 'Smoke App',
  products: ['auth', 'transactions'],
  country_codes: ['US'],
});
assert.equal(link.status, 200);
assert.match(link.payload.link_token, /^link-sandbox-/);

const exchange = await harness.call('POST', '/item/public_token/exchange', {
  public_token: 'public-sandbox-test',
});
assert.match(exchange.payload.access_token, /^access-sandbox-/);

const accounts = await harness.call('POST', '/accounts/get', {
  access_token: exchange.payload.access_token,
});
assert.equal(accounts.payload.accounts.length, 2);
assert.equal(accounts.payload.item.item_id, exchange.payload.item_id);

const auth = await harness.call('POST', '/auth/get', {
  access_token: 'access-sandbox-emulator',
});
assert.equal(auth.payload.accounts.length, 2);
assert.equal(auth.payload.numbers.ach.length, 2);

const institutions = await harness.call('POST', '/institutions/search', { query: 'plaid' });
assert.ok(institutions.payload.institutions.length >= 1);

const generic = await harness.call('POST', '/asset_report/create', {});
assert.equal(generic.payload.status, 'created');
const fdx = await harness.call('GET', '/fdx/recipients', {});
assert.equal(fdx.payload.status, 'ok');

console.log('plaid smoke ok');
