import assert from 'node:assert/strict';
import { contract, plugin } from './api-emulator.mjs';

const routes = [];
const data = new Map();
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
};
plugin.register(app, { getData: (key) => data.get(key), setData: (key, value) => data.set(key, value) });

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
  const url = new URL(path, 'http://devin.local');
  const route = routes.find((item) => item.method === method && match(item.path, url.pathname));
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, url.pathname);
  let status = 200;
  let payload;
  await route.handler({
    req: { param: (name) => params[name], json: async () => body ?? {} },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

assert.equal(contract.provider, 'devin');

const self = await request('GET', '/v3/self');
assert.equal(self.payload.default_org_id, 'org_emulator');

const users = await request('GET', '/v3/enterprise/organizations/org_emulator/members/users');
assert.equal(users.payload.users[0].role, 'admin');

const created = await request('POST', '/v3/organizations/org_emulator/sessions', { title: 'Fix tests', prompt: 'Repair the failing smoke test' });
assert.equal(created.status, 201);
assert.match(created.payload.devin_id, /^devin-/);

const message = await request('POST', `/v3/organizations/org_emulator/sessions/${created.payload.devin_id}/messages`, { message: 'Please continue' });
assert.equal(message.payload.session.messages.at(-1).role, 'assistant');

const listed = await request('GET', '/v3/organizations/org_emulator/sessions');
assert.equal(listed.payload.sessions.length, 1);

const review = await request('POST', '/v3/organizations/org_emulator/pr-reviews', { repository: 'example/repo', pull_request_url: 'https://github.com/example/repo/pull/1' });
assert.equal(review.payload.status, 'completed');

const note = await request('POST', '/v3/organizations/org_emulator/knowledge/notes', { title: 'Release flow', content: 'Use staged rollouts.' });
assert.equal(note.status, 201);

const state = await request('GET', '/devin/inspect/state');
assert.equal(state.payload.knowledgeNotes.length, 1);

console.log('devin smoke ok');
