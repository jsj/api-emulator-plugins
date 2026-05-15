import assert from 'node:assert/strict';
import { plugin } from './api-emulator.mjs';

const routes = [];
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
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

async function request(path) {
  const url = new URL(path, 'http://127.0.0.1');
  const route = routes.find((item) => item.method === 'GET' && match(item.path, url.pathname));
  assert.ok(route, `GET ${path} route should exist`);
  const params = match(route.path, url.pathname);
  let status = 200;
  let payload;
  let text;
  await route.handler({
    req: {
      param: (name) => params[name],
      query: (name) => url.searchParams.get(name) ?? undefined,
    },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
    body: (value, nextStatus = 200) => {
      status = nextStatus;
      text = value;
      return { status, text };
    },
  });
  return { status, payload, text };
}

const contract = await request('/inspect/contract');
assert.equal(contract.payload.fidelity, 'stateful-sdk-emulator');

const embed = await request('/agent/agent_emulator/mobile?target=production');
assert.match(embed.text, /Sierra Emulator Agent/);

const state = await request('/inspect/state');
assert.equal(state.payload.contractStatus, 'mobile-sdk-public');

const namespacedState = await request('/sierra/inspect/state');
assert.equal(namespacedState.payload.contractStatus, 'mobile-sdk-public');

const voice = await request('/chat/voice/svp/agent_emulator');
assert.equal(voice.status, 426);

console.log('sierra smoke ok');
