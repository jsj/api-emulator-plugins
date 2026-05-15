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
    async call(method, path, body = {}, params = {}, query = {}) {
      const handler = routes.get(`${method} ${path}`);
      assert.ok(handler, `missing route ${method} ${path}`);
      let status = 200;
      let payload;
      await handler({
        req: {
          json: async () => body,
          param: (name) => params[name],
          query: (name) => query[name],
          header: () => 'kalshi-emulator-key',
        },
        json: (value, nextStatus = 200) => {
          status = nextStatus;
          payload = value;
          return { status, payload };
        },
        body: (_value, nextStatus = 204) => {
          status = nextStatus;
          payload = null;
          return { status, payload };
        },
      });
      return { status, payload };
    },
  };
}

const harness = createHarness();
assert.equal(contract.provider, 'kalshi');

const status = await harness.call('GET', '/exchange/status');
assert.equal(status.payload.trading_active, true);

const markets = await harness.call('GET', '/markets');
assert.equal(markets.payload.markets.length, 1);

const order = await harness.call('POST', '/portfolio/orders', { ticker: 'KXNBA-26CHAMPS-LAL', count: 3, yes_price: 40 });
assert.equal(order.status, 201);
assert.equal(order.payload.order.ticker, 'KXNBA-26CHAMPS-LAL');

const orders = await harness.call('GET', '/portfolio/orders');
assert.equal(orders.payload.orders.length, 1);

const canceled = await harness.call('DELETE', '/portfolio/orders/:order_id', {}, { order_id: order.payload.order.order_id });
assert.equal(canceled.payload.order.status, 'canceled');

console.log('kalshi smoke ok');
