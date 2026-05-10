import assert from 'node:assert/strict';
import { plugin, contract } from './api-emulator.mjs';

function createHarness() {
  const routes = new Map();
  const data = new Map();
  const app = {
    get: (path, handler) => routes.set(`GET ${path}`, handler),
    post: (path, handler) => routes.set(`POST ${path}`, handler),
    put: (path, handler) => routes.set(`PUT ${path}`, handler),
  };
  plugin.register(app, {
    getData: (key) => data.get(key),
    setData: (key, value) => data.set(key, value),
  });
  return {
    async call(method, path, body = {}, params = {}) {
      const handler = routes.get(`${method} ${path}`);
      assert.ok(handler, `missing route ${method} ${path}`);
      let status = 200;
      let payload;
      await handler({
        req: { json: async () => body, param: (name) => params[name] },
        json: (value, nextStatus = 200) => {
          status = nextStatus;
          payload = value;
          return { status, payload };
        },
        body: (_, nextStatus = 204) => {
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
assert.equal(contract.provider, 'github');
const token = await harness.call('POST', '/app/installations/:installationId/access_tokens', {}, { installationId: '42' });
assert.match(token.payload.token, /github-emulator-installation-token-42/);
const issue = await harness.call('POST', '/repos/:owner/:repo/issues', { title: 'Smoke' }, { owner: 'octo', repo: 'hello' });
assert.equal(issue.payload.number, 1);
await harness.call('POST', '/repos/:owner/:repo/actions/workflows/:workflowId/dispatches', { ref: 'main' }, {
  owner: 'octo',
  repo: 'hello',
  workflowId: 'ci.yml',
});
const runs = await harness.call('GET', '/inspect/workflow-runs');
assert.equal(runs.payload.length, 1);

console.log('github smoke ok');
