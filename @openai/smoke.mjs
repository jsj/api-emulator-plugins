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
const request = { model: 'gpt-4.1-mini', messages: [{ role: 'user', content: 'hello' }] };
const first = await harness.call('POST', '/v1/chat/completions', request);
assert.equal(first.choices[0].message.content, 'openai-emulator-text: hello');

const interactions = harness.data.get('api-emulator:interactions');
assert.equal(interactions.length, 1);
interactions[0].response.choices[0].message.content = 'recorded hello';

const replayed = await harness.call('POST', '/v1/chat/completions', request);
assert.equal(replayed.choices[0].message.content, 'recorded hello');

console.log('openai smoke ok');
