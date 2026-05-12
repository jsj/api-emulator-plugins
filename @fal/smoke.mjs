import assert from 'node:assert/strict';
import { plugin } from './api-emulator.mjs';

function createHarness() {
  const routes = new Map();
  const data = new Map();
  const app = {
    get: (path, handler) => routes.set(`GET ${path}`, handler),
    post: (path, handler) => routes.set(`POST ${path}`, handler),
    put: (path, handler) => routes.set(`PUT ${path}`, handler),
    delete: (path, handler) => routes.set(`DELETE ${path}`, handler),
  };
  const store = {
    getData: (key) => data.get(key),
    setData: (key, value) => data.set(key, value),
  };
  plugin.register(app, store);
  return {
    async call(method, route, body = {}, params = {}, urlPath = route) {
      const handler = routes.get(`${method} ${route}`);
      assert.ok(handler, `missing route ${method} ${route}`);
      let status = 200;
      let payload;
      const response = await handler({
        req: {
          url: `http://fal.local${urlPath}`,
          json: async () => body,
          param: (key) => params[key],
        },
        json: (value, nextStatus = 200) => {
          status = nextStatus;
          payload = value;
          return { status, payload };
        },
        body: (_value, nextStatus = 204) => {
          status = nextStatus;
          return { status };
        },
      });
      return response instanceof Response ? response : { status, payload };
    },
  };
}

const harness = createHarness();

const models = await harness.call('GET', '/models');
assert.equal(models.status, 200);
assert.ok(models.payload.models.some((model) => model.endpoint_id === 'fal-ai/flux/dev'));

const key = await harness.call('POST', '/keys', { name: 'Smoke key' });
assert.equal(key.payload.key_secret, 'fal-emulator-secret');

const instance = await harness.call('POST', '/compute/instances', { instance_type: 'gpu_1x_h100_sxm5' });
assert.equal(instance.payload.status, 'running');

const queueSubmit = await harness.call('POST', '/*', { prompt: 'smoke' }, {}, '/fal-ai/flux/dev');
assert.equal(queueSubmit.payload.status, 'COMPLETED');
assert.match(queueSubmit.payload.request_id, /^emu_fal_request_/);

const status = await harness.call('GET', '/*', {}, {}, `/fal-ai/flux/dev/requests/${queueSubmit.payload.request_id}/status`);
assert.equal(status.payload.status, 'COMPLETED');

const result = await harness.call('GET', '/*', {}, {}, `/fal-ai/flux/dev/requests/${queueSubmit.payload.request_id}`);
assert.equal(result.payload.images[0].content_type, 'image/png');

const seedance = await harness.call('POST', '/bytedance/seedance-2.0/fast/text-to-video', { prompt: 'video' });
assert.equal(seedance.payload.request_id, 'emu_fal_request_123');

const requests = await harness.call('GET', '/models/requests/search');
assert.equal(requests.payload.results.length, 1);

console.log('fal smoke ok');
