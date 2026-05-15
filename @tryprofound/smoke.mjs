import assert from 'node:assert/strict';
import { apiMdRoutes, plugin, contract } from './api-emulator.mjs';

const routes = [];
const data = new Map();
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  put: (path, handler) => routes.push({ method: 'PUT', path, handler }),
  patch: (path, handler) => routes.push({ method: 'PATCH', path, handler }),
  delete: (path, handler) => routes.push({ method: 'DELETE', path, handler }),
};
const store = {
  getData: (key) => data.get(key),
  setData: (key, value) => data.set(key, value),
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
  const url = new URL(path, 'http://tryprofound.local');
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
    text: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

assert.equal(contract.provider, 'tryprofound');
assert.equal(contract.coverage.routeCount, 42);

for (const route of apiMdRoutes) {
  assert.ok(routes.some((item) => item.method === route.method && item.path === route.path), `${route.method} ${route.path} should be registered`);
}

const orgs = await request('GET', '/v1/org');
assert.equal(orgs.payload.data[0].id, 'org_emulator');

const createdPrompts = await request('POST', '/v1/org/categories/category_emulator/prompts', {
  prompts: [{ prompt: 'Where does Profound appear?', language: 'en', platforms: ['chatgpt'], regions: ['US'], topic: 'Visibility' }],
});
assert.equal(createdPrompts.status, 201);
assert.equal(createdPrompts.payload.data[0].status, 'active');

const prompts = await request('GET', '/v1/org/categories/category_emulator/prompts?limit=10');
assert.ok(prompts.payload.data.some((prompt) => prompt.prompt.includes('Profound')));

const report = await request('POST', '/v1/reports/visibility', { category_id: 'category_emulator', metrics: ['visibility_score'], dimensions: ['model'] });
assert.equal(report.payload.data[0].report_type, 'visibility');
assert.equal(report.payload.info.total_rows, 1);

const stream = await request('POST', '/v1/reports/citations/stream', { category_id: 'category_emulator' });
assert.match(stream.payload, /event: data/);

const run = await request('POST', '/v1/agents/agent_emulator/runs', { inputs: { query: 'test' } });
assert.equal(run.status, 201);
assert.equal(run.payload.status, 'completed');

const fetchedRun = await request('GET', `/v1/agents/agent_emulator/runs/${run.payload.id}`);
assert.equal(fetchedRun.payload.outputs.result, 'Emulator agent run completed');

const search = await request('POST', '/v1/knowledge-bases/kb_emulator/search', { query: 'emulator', top_k: 1, return_full_page: true });
assert.equal(search.payload.data[0].document_name, 'intro.txt');

const document = await request('POST', '/v1/knowledge-bases/kb_emulator/documents', { name: 'sdk.txt', text: 'SDK emulator document', folder: '/' });
assert.equal(document.status, 201);

const deleted = await request('DELETE', '/v1/knowledge-bases/kb_emulator/documents', { name: 'sdk.txt' });
assert.equal(deleted.payload.deleted, 1);

console.log('tryprofound smoke ok');
