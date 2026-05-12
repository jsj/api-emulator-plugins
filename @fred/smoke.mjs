import assert from 'node:assert/strict';
import { contract, plugin } from './api-emulator.mjs';

function createHarness() {
  const routes = new Map();
  const data = new Map();
  const app = { get: (path, handler) => routes.set(`GET ${path}`, handler) };
  const store = {
    getData: (key) => data.get(key),
    setData: (key, value) => data.set(key, value),
  };
  plugin.register(app, store);
  return {
    async call(path, query = {}) {
      const handler = routes.get(`GET ${path}`);
      assert.ok(handler, `missing route GET ${path}`);
      let payload;
      await handler({
        req: { query: (name) => query[name] },
        json: (value) => {
          payload = value;
          return { status: 200, payload };
        },
      });
      return payload;
    },
  };
}

const harness = createHarness();
assert.equal(contract.provider, 'fred');
const search = await harness.call('/series/search', { search_text: 'rate', limit: '1' });
assert.equal(search.seriess.length, 1);
const series = await harness.call('/series', { series_id: search.seriess[0].id });
assert.equal(series.seriess[0].id, search.seriess[0].id);
const observations = await harness.call('/series/observations', { series_id: search.seriess[0].id, limit: '2' });
assert.equal(observations.observations.length, 2);

console.log('fred smoke ok');
