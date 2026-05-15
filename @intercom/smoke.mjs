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

async function request(method, path, body) {
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
      json: async () => body ?? {},
    },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

const admins = await request('GET', '/admins');
assert.equal(admins.payload.data[0].email, 'admin@example.com');

const contact = await request('POST', '/contacts', { email: 'grace@example.com', name: 'Grace Hopper', external_id: 'user_grace' });
assert.equal(contact.status, 201);

const fetched = await request('GET', `/contacts/${contact.payload.id}`);
assert.equal(fetched.payload.email, 'grace@example.com');

const search = await request('POST', '/conversations/search', { query: 'login' });
assert.equal(search.payload.data[0].id, 'conversation_1');

const reply = await request('POST', '/conversations/conversation_1/reply', { body: 'Thanks for contacting support.' });
assert.match(reply.payload.conversation_parts.conversation_parts.at(-1).body, /Thanks/);

console.log('intercom smoke ok');
