import assert from 'node:assert/strict';
import { plugin, contract } from './api-emulator.mjs';

function createHarness() {
  const routes = new Map();
  const data = new Map();
  const deliveries = [];
  const app = {
    get: (path, handler) => routes.set(`GET ${path}`, handler),
    post: (path, handler) => routes.set(`POST ${path}`, handler),
  };
  plugin.register(app, {
    getData: (key) => data.get(key),
    setData: (key, value) => data.set(key, value),
  });
  globalThis.fetch = async (url, init = {}) => {
    deliveries.push({ url, init });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };
  return {
    deliveries,
    async call(method, path, body = {}) {
      const handler = routes.get(`${method} ${path}`);
      assert.ok(handler, `missing route ${method} ${path}`);
      let status = 200;
      let payload;
      await handler({
        req: {
          json: async () => body,
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
assert.equal(contract.provider, 'sentry');
await harness.call('POST', '/control/targets', {
  url: 'http://127.0.0.1:8787/v1/webhooks/sentry/crash',
  secret: 'sentry-emulator-secret',
});
const triggered = await harness.call('POST', '/control/issues', {
  issue: { title: 'Fatal crash in Bot Detail', metadata: { filename: 'BotDetailView.swift' } },
});
assert.equal(triggered.status, 202);
assert.equal(harness.deliveries.length, 1);
assert.match(harness.deliveries[0].init.headers['sentry-hook-signature'], /^[a-f0-9]{64}$/);
assert.match(harness.deliveries[0].init.body, /Fatal crash in Bot Detail/);

console.log('sentry smoke ok');
