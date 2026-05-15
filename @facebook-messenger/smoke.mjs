import assert from 'node:assert/strict';
import { plugin } from './api-emulator.mjs';

const routes = [];
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
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

const accounts = await request('GET', '/v20.0/me/accounts');
assert.equal(accounts.payload.data[0].id, 'page_123');

const sent = await request('POST', '/v20.0/page_123/messages', {
  recipient: { id: 'psid_456' },
  message: { text: 'hello from smoke' },
});
assert.match(sent.payload.message_id, /^mid\.emulator\./);

const conversations = await request('GET', '/v20.0/page_123/conversations');
assert.ok(conversations.payload.data.some((conversation) => conversation.participants.data.some((participant) => participant.id === 'psid_456')));

const conversation = conversations.payload.data.find((item) => item.participants.data.some((participant) => participant.id === 'psid_456'));
const messages = await request('GET', `/v20.0/${conversation.id}/messages`);
assert.equal(messages.payload.data[0].message.text, 'hello from smoke');

const profile = await request('GET', '/v20.0/psid_123');
assert.equal(profile.payload.name, 'Ada Lovelace');

console.log('facebook messenger smoke ok');
