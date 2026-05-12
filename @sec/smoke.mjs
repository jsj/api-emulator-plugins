import assert from 'node:assert/strict';
import { contract, plugin } from './api-emulator.mjs';

function createHarness() {
  const routes = new Map();
  const data = new Map();
  const app = {
    get: (path, handler) => routes.set(`GET ${path}`, handler),
    post: (path, handler) => routes.set(`POST ${path}`, handler),
  };
  const store = {
    getData: (key) => data.get(key),
    setData: (key, value) => data.set(key, value),
  };
  plugin.register(app, store);
  return {
    async call(method, path, body = {}, params = {}) {
      const handler = routes.get(`${method} ${path}`);
      assert.ok(handler, `missing route ${method} ${path}`);
      let status = 200;
      let payload;
      await handler({
        req: {
          json: async () => body,
          param: (name) => params[name],
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
assert.equal(contract.provider, 'sec');
const tickers = await harness.call('GET', '/files/company_tickers.json');
assert.equal(tickers.payload['0'].ticker, 'EXRB');
const company = await harness.call('GET', '/submissions/:filename', {}, { filename: 'CIK0000001001.json' });
assert.equal(company.payload.name, 'Example Robotics Inc.');
const created = await harness.call('POST', '/control/companies', { cik: '2001', name: 'Example Energy LLC', tickers: ['EXEN'] });
assert.equal(created.status, 201);

console.log('sec smoke ok');
