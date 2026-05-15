import assert from 'node:assert/strict';
import { plugin, contract } from './api-emulator.mjs';

function createHarness() {
  const routes = new Map();
  const data = new Map();
  const app = {
    get: (path, handler) => routes.set(`GET ${path}`, handler),
    post: (path, handler) => routes.set(`POST ${path}`, handler),
    patch: (path, handler) => routes.set(`PATCH ${path}`, handler),
    delete: (path, handler) => routes.set(`DELETE ${path}`, handler),
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
assert.equal(contract.provider, 'modal');

const token = await harness.call('GET', '/modal/v1/token/info');
assert.equal(token.payload.workspace_name, 'emulator');
assert.equal(token.payload.token_id, 'ak-emulator');

const apps = await harness.call('GET', '/modal/v1/apps');
assert.equal(apps.payload.apps[0].app_id, 'ap-aaaaaaaaaaaaaaaaaaaaaa');

const created = await harness.call('POST', '/modal/v1/apps', { name: 'cli-smoke', state: 'deployed', n_running_tasks: 2 });
assert.equal(created.status, 201);
assert.equal(created.payload.name, 'cli-smoke');

const stopped = await harness.call('DELETE', '/modal/v1/apps/:app_id', {}, { app_id: created.payload.app_id });
assert.equal(stopped.payload.state, 'stopped');
assert.equal(stopped.payload.n_running_tasks, 0);

const secret = await harness.call('POST', '/modal/v1/secrets', { name: 'cli-secret', values: { API_KEY: 'dummy' } });
assert.equal(secret.status, 201);
assert.deepEqual(secret.payload.metadata.keys, ['API_KEY']);

const volume = await harness.call('POST', '/modal/v1/volumes', { name: 'cache-two' });
assert.equal(volume.payload.label, 'cache-two');

const state = await harness.call('GET', '/modal/inspect/state');
assert.ok(state.payload.apps.some((item) => item.name === 'cli-smoke'));

console.log('modal smoke ok');
