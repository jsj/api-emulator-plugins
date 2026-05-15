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
    setData: (key, value) => {
      if (value === null) data.delete(key);
      else data.set(key, value);
    },
  };
  plugin.register(app, store);
  return {
    async call(method, route, { body = {}, params = {}, query = {}, headers = { 'xi-api-key': 'test-key' } } = {}) {
      const handler = routes.get(`${method} ${route}`);
      assert.ok(handler, `missing route ${method} ${route}`);
      let status = 200;
      let payload;
      let responseHeaders = {};
      const response = await handler({
        req: {
          json: async () => body,
          param: (key) => params[key],
          query: (key) => query[key],
          header: (key) => headers[key.toLowerCase()] ?? headers[key],
        },
        json: (value, nextStatus = 200) => {
          status = nextStatus;
          payload = value;
          return { status, payload };
        },
        body: (value, nextStatus = 200, nextHeaders = {}) => {
          status = nextStatus;
          payload = value;
          responseHeaders = nextHeaders;
          return { status, payload, headers: responseHeaders };
        },
      });
      return response ?? { status, payload, headers: responseHeaders };
    },
  };
}

const harness = createHarness();
assert.equal(contract.provider, 'elevenlabs');

const unauthenticated = await harness.call('GET', '/v1/models', { headers: {} });
assert.equal(unauthenticated.status, 401);
assert.equal(unauthenticated.payload.detail.status, 'invalid_api_key');

const models = await harness.call('GET', '/v1/models');
assert.equal(models.status, 200);
assert.ok(models.payload.some((model) => model.model_id === 'eleven_multilingual_v2'));

const voices = await harness.call('GET', '/v2/voices', { query: { page_size: '1' } });
assert.equal(voices.payload.voices.length, 1);
assert.equal(voices.payload.has_more, true);
assert.equal(voices.payload.next_page_token, 'page_1');

const voice = await harness.call('GET', '/v1/voices/:voice_id', { params: { voice_id: 'JBFqnCBsd6RMkjVDRZzb' } });
assert.equal(voice.payload.name, 'Rachel');

const audio = await harness.call('POST', '/v1/text-to-speech/:voice_id', {
  params: { voice_id: 'JBFqnCBsd6RMkjVDRZzb' },
  body: { text: 'Hello from ElevenLabs emulator', model_id: 'eleven_multilingual_v2' },
});
assert.equal(audio.status, 200);
assert.equal(audio.headers['content-type'], 'audio/mpeg');
assert.equal(audio.headers['x-character-count'], '30');
assert.match(audio.payload.toString(), /Hello from ElevenLabs emulator/);

const stream = await harness.call('POST', '/v1/text-to-speech/:voice_id/stream/with-timestamps', {
  params: { voice_id: 'JBFqnCBsd6RMkjVDRZzb' },
  body: { text: 'Hello from unofficial CLI', model_id: 'eleven_multilingual_v2' },
});
assert.equal(stream.status, 200);
assert.equal(stream.headers['content-type'], 'audio/mpeg');
assert.match(stream.payload.toString(), /Hello from unofficial CLI/);

const history = await harness.call('GET', '/v1/history', { query: { page_size: '1' } });
assert.equal(history.payload.history.length, 1);
assert.equal(history.payload.history[0].voice_id, 'JBFqnCBsd6RMkjVDRZzb');
assert.equal(history.payload.has_more, true);

const user = await harness.call('GET', '/v1/user');
assert.equal(user.payload.subscription.character_count, 55);

const validation = await harness.call('POST', '/v1/text-to-speech/:voice_id', {
  params: { voice_id: 'JBFqnCBsd6RMkjVDRZzb' },
  body: { text: '' },
});
assert.equal(validation.status, 422);
assert.equal(validation.payload.detail[0].loc.join('.'), 'body.text');

console.log('elevenlabs smoke ok');
