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
    async call(method, path, query = {}) {
      const handler = routes.get(`${method} ${path}`);
      assert.ok(handler, `missing route ${method} ${path}`);
      let status = 200;
      let payload;
      await handler({
        req: { query: (key) => query[key] },
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
assert.equal(contract.provider, 'brave-search');

const web = await harness.call('GET', '/res/v1/web/search', { q: 'agent APIs', count: '1' });
assert.equal(web.status, 200);
assert.equal(web.payload.web.results.length, 1);
assert.match(web.payload.web.results[0].title, /agent APIs/);

const news = await harness.call('GET', '/res/v1/news/search', { q: 'agent APIs', count: '1' });
assert.equal(news.payload.news.results.length, 1);
assert.match(news.payload.news.results[0].description, /agent APIs/);

const suggest = await harness.call('GET', '/res/v1/suggest/search', { q: 'exa' });
assert.deepEqual(suggest.payload.results.slice(0, 2), ['exa', 'exa api']);

const state = await harness.call('GET', '/inspect/state');
assert.equal(state.payload.searches.length, 2);
assert.equal(state.payload.suggestions[0].q, 'exa');

console.log('brave-search smoke ok');
