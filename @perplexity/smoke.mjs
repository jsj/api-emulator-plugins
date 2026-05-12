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
    async call(method, path, body = {}) {
      const handler = routes.get(`${method} ${path}`);
      assert.ok(handler, `missing route ${method} ${path}`);
      let status = 200;
      let payload;
      await handler({
        req: { json: async () => body },
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
assert.equal(contract.provider, 'perplexity');
const search = await harness.call('POST', '/search', { query: 'Fed decision', max_results: 1 });
assert.equal(search.status, 200);
assert.equal(search.payload.results.length, 1);
assert.match(search.payload.results[0].title, /Fed decision/);
const searches = await harness.call('GET', '/inspect/searches');
assert.equal(searches.payload[0].query, 'Fed decision');

console.log('perplexity smoke ok');
