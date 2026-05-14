import assert from 'node:assert/strict';
import { contract, plugin } from './api-emulator.mjs';

function createHarness() {
  const routes = new Map();
  const app = {
    all: (path, handler) => routes.set(`ALL ${path}`, handler),
    get: (path, handler) => routes.set(`GET ${path}`, handler),
    post: (path, handler) => routes.set(`POST ${path}`, handler),
    put: (path, handler) => routes.set(`PUT ${path}`, handler),
    patch: (path, handler) => routes.set(`PATCH ${path}`, handler),
    delete: (path, handler) => routes.set(`DELETE ${path}`, handler),
  };
  const data = new Map();
  const store = {
    getData: (key) => data.get(key),
    setData: (key, value) => data.set(key, value),
  };
  plugin.register(app, store);

  function matchDynamic(method, path) {
    for (const [key, handler] of routes) {
      const [routeMethod, routePath] = key.split(' ');
      if (routeMethod !== method && routeMethod !== 'ALL') continue;
      const routeParts = routePath.split('/').filter(Boolean);
      const pathParts = path.split('/').filter(Boolean);
      if (routeParts.length !== pathParts.length) continue;
      const params = {};
      let matched = true;
      for (let i = 0; i < routeParts.length; i += 1) {
        if (routeParts[i].startsWith(':')) {
          params[routeParts[i].slice(1).split(':')[0]] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
          matched = false;
          break;
        }
      }
      if (matched) return { handler, params };
    }
    return undefined;
  }

  return {
    async call(method, path, body = {}, params = {}, queries = {}) {
      const dynamic = matchDynamic(method, path);
      const handler =
        routes.get(`${method} ${path}`)
        ?? routes.get(`ALL ${path}`)
        ?? dynamic?.handler
        ?? routes.get(`ALL /:service/:version/*`)
        ?? routes.get(`ALL /upload/:service/:version/*`);
      assert.ok(handler, `missing route ${method} ${path}`);
      const mergedParams = { ...dynamic?.params, ...params };
      let status = 200;
      let payload;
      const response = await handler({
        req: {
          method,
          url: `https://google.test${path}`,
          json: async () => body,
          param: (name) => mergedParams[name] ?? (name === '*' ? path.replace(/^\/+/, '') : undefined),
          query: (name) => queries[name],
          header: () => undefined,
        },
        json: (value, nextStatus = 200) => {
          status = nextStatus;
          payload = value;
          return { status, payload };
        },
      });
      if (response instanceof Response) status = response.status;
      return { status, payload };
    },
  };
}

const harness = createHarness();

assert.equal(contract.provider, 'google');
assert.equal(contract.discoveryServiceCount, 24);
assert.ok(contract.scope.includes('drive'));
assert.ok(contract.scope.includes('vault'));
assert.ok(contract.scope.includes('workspaceevents'));

const files = await harness.call('GET', '/drive/v3/files', {}, {}, { pageSize: '1' });
assert.equal(files.status, 200);
assert.equal(files.payload.files.length, 1);

const createdFile = await harness.call('POST', '/drive/v3/files', { name: 'Smoke Doc', mimeType: 'text/plain' });
assert.equal(createdFile.payload.name, 'Smoke Doc');

const message = await harness.call('POST', '/gmail/v1/users/me/messages/send', { raw: 'Zm9v' });
assert.match(message.payload.id, /^msg_/);

const event = await harness.call('POST', '/calendar/v3/calendars/primary/events', { summary: 'Smoke Event' });
assert.equal(event.payload.summary, 'Smoke Event');

const sheet = await harness.call('POST', '/sheets/v4/spreadsheets', { properties: { title: 'Smoke Sheet' } });
assert.match(sheet.payload.spreadsheetId, /^sheet_/);

const generic = await harness.call('GET', '/vault/v1/matters', {}, { service: 'vault', version: 'v1', '*': 'vault/v1/matters' });
assert.equal(generic.payload.kind, 'vault#matters');
assert.equal(generic.payload.items.length, 1);

console.log('google workspace smoke ok');
