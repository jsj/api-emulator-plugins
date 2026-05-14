import assert from 'node:assert/strict';
import { plugin, contract } from './api-emulator.mjs';

function createHarness() {
  const routes = new Map();
  const data = new Map();
  const app = {
    get: (path, handler) => routes.set(`GET ${path}`, handler),
    post: (path, handler) => routes.set(`POST ${path}`, handler),
    patch: (path, handler) => routes.set(`PATCH ${path}`, handler),
  };
  plugin.register(app, {
    getData: (key) => data.get(key),
    setData: (key, value) => data.set(key, value),
  });
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
          header: () => undefined,
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
assert.equal(contract.provider, 'posthog');
await harness.call('POST', '/control/feature-flags/:key', { value: 'variant-a' }, { key: 'new-flow' });
const captured = await harness.call('POST', '/capture', {
  api_key: 'posthog-emulator-key',
  event: 'Signup',
  distinct_id: 'user-1',
  properties: { plan: 'pro' },
});
assert.equal(captured.payload.status, 1);
const decided = await harness.call('POST', '/decide', { token: 'posthog-emulator-key', distinct_id: 'user-1' });
assert.equal(decided.payload.featureFlags['new-flow'], 'variant-a');
const events = await harness.call('GET', '/inspect/events');
assert.equal(events.payload.length, 1);
await harness.call('POST', '/capture', {
  api_key: 'posthog-emulator-key',
  event: 'app_opened',
  distinct_id: 'churn-user',
  timestamp: '2026-05-07T15:00:00.000Z',
  properties: { $email: 'churn@example.com' },
});
await harness.call('POST', '/capture', {
  api_key: 'posthog-emulator-key',
  event: 'app_opened',
  distinct_id: 'active-user',
  timestamp: '2026-05-07T15:00:00.000Z',
});
await harness.call('POST', '/capture', {
  api_key: 'posthog-emulator-key',
  event: 'settings_viewed',
  distinct_id: 'active-user',
  timestamp: '2026-05-08T15:00:00.000Z',
});
const churn = await harness.call('POST', '/api/projects/:projectId/query/', {
  query: {
    kind: 'HogQLQuery',
    query: `
      WITH entry AS (SELECT distinct_id FROM events WHERE event IN ('app_opened') HAVING entry_at >= toDateTime('2026-05-07 00:00:00.000') AND entry_at < toDateTime('2026-05-08 00:00:00.000')),
      activation AS (SELECT distinct_id FROM events)
      SELECT entry.distinct_id FROM entry LEFT JOIN activation ON activation.distinct_id = entry.distinct_id WHERE activation.activated_at IS NULL LIMIT 10
    `,
  },
}, { projectId: '123' });
assert.equal(churn.payload.results.length, 1);
assert.equal(churn.payload.results[0][0], 'churn-user');

console.log('posthog smoke ok');
