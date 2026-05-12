import assert from 'node:assert/strict';
import { plugin } from './api-emulator.mjs';

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
    data,
    async call(method, path, body = {}) {
      const handler = routes.get(`${method} ${path}`);
      assert.ok(handler, `missing route ${method} ${path}`);
      let payload;
      await handler({
        req: { json: async () => body },
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
const request = { model: 'claude-sonnet-4-20250514', messages: [{ role: 'user', content: 'hello' }] };
const first = await harness.call('POST', '/v1/messages', request);
assert.equal(first.content[0].type, 'text');

const interactions = harness.data.get('api-emulator:interactions');
assert.equal(interactions.length, 1);
interactions[0].response.content[0].text = 'recorded hello';

const replayed = await harness.call('POST', '/v1/messages', request);
assert.equal(replayed.content[0].text, 'recorded hello');

console.log('anthropic smoke ok');
