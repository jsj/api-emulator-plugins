import assert from 'node:assert/strict';
import { plugin } from './api-emulator.mjs';

const routes = [];
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  delete: (path, handler) => routes.push({ method: 'DELETE', path, handler }),
};
const store = {
  data: new Map(),
  getData(key) { return this.data.get(key); },
  setData(key, value) { this.data.set(key, value); },
};

plugin.register(app, store);

function match(routePath, requestPath) {
  const routeParts = routePath.split('/').filter(Boolean);
  const requestParts = requestPath.split('/').filter(Boolean);
  if (routeParts.length !== requestParts.length) return null;
  const params = {};
  for (let i = 0; i < routeParts.length; i += 1) {
    if (routeParts[i].startsWith(':')) params[routeParts[i].slice(1)] = decodeURIComponent(requestParts[i]);
    else if (routeParts[i] !== requestParts[i]) return null;
  }
  return params;
}

async function request(method, path, input) {
  const url = new URL(path, 'http://127.0.0.1');
  const route = routes.find((item) => item.method === method && match(item.path, url.pathname));
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, url.pathname);
  let status = 200;
  let payload;
  await route.handler({
    req: {
      url: url.toString(),
      param: (name) => params[name],
      query: (name) => url.searchParams.get(name) ?? undefined,
      json: async () => input ?? {},
    },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
    text: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

const verified = await request('GET', '/webhook?hub.mode=subscribe&hub.verify_token=test&hub.challenge=ok');
assert.equal(verified.payload, 'ok');

const phones = await request('GET', '/v20.0/whatsapp_business_seed/phone_numbers');
assert.equal(phones.payload.data[0].id, '15550001111');

const sent = await request('POST', '/v20.0/15550001111/messages', {
  messaging_product: 'whatsapp',
  to: '+15551234567',
  type: 'text',
  text: { body: 'hello from smoke' },
});
assert.match(sent.payload.messages[0].id, /^wamid\.emulator\./);

const messages = await request('GET', '/v20.0/15550001111/messages');
assert.ok(messages.payload.data.some((message) => message.text?.body === 'hello from smoke'));

const media = await request('POST', '/v20.0/15550001111/media', { type: 'image/png', url: 'https://example.test/image.png' });
assert.match(media.payload.id, /^media_/);

const fetchedMedia = await request('GET', `/v20.0/${media.payload.id}`);
assert.equal(fetchedMedia.payload.mime_type, 'image/png');

const deletedMedia = await request('DELETE', `/v20.0/${media.payload.id}`);
assert.equal(deletedMedia.payload.success, true);

console.log('whatsapp smoke ok');
