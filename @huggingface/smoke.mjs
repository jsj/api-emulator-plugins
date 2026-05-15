import assert from 'node:assert/strict';
import { contract, plugin } from './api-emulator.mjs';

function matchRoute(routePath, requestPath) {
  const routeParts = routePath.split('/').filter(Boolean);
  const requestParts = requestPath.split('/').filter(Boolean);
  const params = {};
  for (let i = 0, j = 0; i < routeParts.length; i += 1, j += 1) {
    const part = routeParts[i];
    const rest = part.match(/^:([^{}]+)\{\.\+\}$/);
    if (rest) {
      params[rest[1]] = requestParts.slice(j).join('/');
      return params;
    }
    if (j >= requestParts.length) return null;
    if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(requestParts[j]);
    else if (part !== requestParts[j]) return null;
  }
  return routeParts.length === requestParts.length ? params : null;
}

function routeScore(routePath) {
  return routePath
    .split('/')
    .filter(Boolean)
    .reduce((score, part) => score + (part.startsWith(':') ? 1 : 100), 0);
}

function createHarness() {
  const routes = [];
  const data = new Map();
  const app = {
    get: (path, handler) => routes.push({ method: 'GET', path, handler }),
    post: (path, handler) => routes.push({ method: 'POST', path, handler }),
    delete: (path, handler) => routes.push({ method: 'DELETE', path, handler }),
  };
  const store = {
    getData: (key) => data.get(key),
    setData: (key, value) => data.set(key, value),
  };
  plugin.register(app, store);
  return {
    async call(method, path, body = undefined, headers = {}) {
      const url = new URL(path, 'http://localhost');
      let selected;
      for (const route of routes) {
        if (route.method !== method) continue;
        const params = matchRoute(route.path, url.pathname);
        if (!params) continue;
        const score = routeScore(route.path);
        if (!selected || score > selected.score) selected = { route, params, score };
      }
      assert.ok(selected, `missing route ${method} ${path}`);
      let status = 200;
      let payload;
      await selected.route.handler({
        req: {
          json: async () => body ?? {},
          text: async () => (typeof body === 'string' ? body : new URLSearchParams(body ?? {}).toString()),
          parseBody: async () => (typeof body === 'string' ? Object.fromEntries(new URLSearchParams(body)) : body ?? {}),
          query: (name) => url.searchParams.get(name) ?? undefined,
          param: (name) => selected.params[name],
          header: (name) => headers[name.toLowerCase()] ?? headers[name] ?? undefined,
        },
        json: (value, nextStatus = 200) => {
          status = nextStatus;
          payload = value;
          return { status, payload };
        },
        redirect: (location, nextStatus = 302) => {
          status = nextStatus;
          payload = { location };
          return { status, payload };
        },
      });
      return { status, payload };
    },
  };
}

const harness = createHarness();
assert.equal(contract.provider, 'huggingface');

const whoami = await harness.call('GET', '/api/whoami-v2');
assert.equal(whoami.payload.name, 'emulator');

const models = await harness.call('GET', '/api/models?search=hello&limit=1');
assert.equal(models.payload[0].id, 'emulator/hello-world');

const model = await harness.call('GET', '/api/models/emulator/hello-world');
assert.equal(model.payload.pipeline_tag, 'text-generation');
assert.equal(model.payload.likes, 7);

const likedRepos = await harness.call('GET', '/api/users/emulator/likes');
assert.equal(likedRepos.payload[0].repo.name, 'emulator/hello-world');
assert.equal(likedRepos.payload[0].repo.type, 'model');

const likers = await harness.call('GET', '/api/models/emulator/hello-world/likers');
assert.equal(likers.payload[0].user, 'emulator');

const unlike = await harness.call('DELETE', '/api/models/emulator/hello-world/like');
assert.equal(unlike.payload.liked, false);
assert.equal(unlike.payload.likes, 6);

const like = await harness.call('POST', '/api/models/emulator/hello-world/like');
assert.equal(like.payload.liked, true);
assert.equal(like.payload.likes, 7);

const tree = await harness.call('GET', '/api/models/emulator/hello-world/tree/main');
assert.ok(tree.payload.some((entry) => entry.path === 'README.md'));

const created = await harness.call('POST', '/api/repos/create', {
  name: 'cli-smoke-model',
  organization: 'emulator',
  type: 'model',
  private: true,
});
assert.equal(created.status, 201);
assert.equal(created.payload.name, 'emulator/cli-smoke-model');

const state = await harness.call('GET', '/huggingface/inspect/state');
assert.equal(state.payload.createdRepos[0].name, 'emulator/cli-smoke-model');

const discovery = await harness.call('GET', '/.well-known/openid-configuration');
assert.match(discovery.payload.authorization_endpoint, /\/oauth\/authorize$/);

const authorization = await harness.call('GET', '/oauth/authorize?client_id=hf_emulator_client&redirect_uri=http%3A%2F%2Flocalhost%2Fcallback&scope=openid%20profile%20email&state=abc');
assert.equal(authorization.status, 302);
assert.match(authorization.payload.location, /code=hf_code_1/);
assert.match(authorization.payload.location, /state=abc/);

const token = await harness.call(
  'POST',
  '/oauth/token',
  'grant_type=authorization_code&code=hf_code_1&client_id=hf_emulator_client',
  { 'content-type': 'application/x-www-form-urlencoded' },
);
assert.equal(token.payload.token_type, 'Bearer');
assert.match(token.payload.access_token, /^hf_oauth_/);

const device = await harness.call(
  'POST',
  '/oauth/device',
  'client_id=hf_emulator_client&scope=openid%20profile',
  { 'content-type': 'application/x-www-form-urlencoded' },
);
assert.match(device.payload.device_code, /^hf_device_/);

const deviceToken = await harness.call(
  'POST',
  '/oauth/token',
  `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:device_code')}&device_code=${device.payload.device_code}&client_id=hf_emulator_client`,
  { 'content-type': 'application/x-www-form-urlencoded' },
);
assert.equal(deviceToken.payload.token_type, 'Bearer');

const userinfo = await harness.call('GET', '/oauth/userinfo');
assert.equal(userinfo.payload.preferred_username, 'emulator');
assert.equal(userinfo.payload.email_verified, true);

console.log('huggingface smoke ok');
