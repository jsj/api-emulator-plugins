import assert from 'node:assert/strict';
import { contract, plugin } from './api-emulator.mjs';

function matchRoute(routePath, requestPath) {
  const routeParts = routePath.split('/').filter(Boolean);
  const requestParts = requestPath.split('/').filter(Boolean);
  const params = {};
  for (let i = 0; i < routeParts.length; i += 1) {
    if (i >= requestParts.length) return null;
    const part = routeParts[i];
    if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(requestParts[i]);
    else if (part !== requestParts[i]) return null;
  }
  return routeParts.length === requestParts.length ? params : null;
}

function routeScore(path) {
  return path.split('/').filter(Boolean).reduce((score, part) => score + (part.startsWith(':') ? 1 : 100), 0);
}

function createHarness() {
  const routes = [];
  const data = new Map();
  const app = {
    get: (path, handler) => routes.push({ method: 'GET', path, handler }),
    post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  };
  plugin.register(app, { getData: (key) => data.get(key), setData: (key, value) => data.set(key, value) });
  return {
    async call(method, path, body) {
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
          url: url.pathname,
          json: async () => body ?? {},
          query: (name) => url.searchParams.get(name) ?? undefined,
          param: (name) => selected.params[name],
        },
        json: (value, nextStatus = 200) => {
          status = nextStatus;
          payload = value;
          return { status, payload };
        },
      });
      return { status, payload };
    },
  };
}

const harness = createHarness();
assert.equal(contract.provider, 'mintlify');

const update = await harness.call('POST', '/v1/project/update/proj_emulator');
assert.equal(update.status, 202);
assert.match(update.payload.statusId, /^upd_/);

const status = await harness.call('GET', `/v1/project/update-status/${update.payload.statusId}`);
assert.equal(status.payload.status, 'success');
assert.equal(status.payload.projectId, 'proj_emulator');

const preview = await harness.call('POST', '/v1/project/preview/proj_emulator', { branch: 'feature-docs' });
assert.equal(preview.status, 202);
assert.match(preview.payload.previewUrl, /feature-docs\.mintlify\.app$/);

const agentJob = await harness.call('POST', '/v2/agent/proj_emulator/job', { prompt: 'Add Python SDK examples' });
assert.equal(agentJob.status, 201);
assert.equal(agentJob.payload.status, 'completed');
assert.match(agentJob.payload.prLink, /github\.com\/emulator\/emulator-docs\/pull\//);

const agentStatus = await harness.call('GET', `/v2/agent/proj_emulator/job/${agentJob.payload.id}`);
assert.equal(agentStatus.payload.id, agentJob.payload.id);

const followUp = await harness.call('POST', `/v2/agent/proj_emulator/job/${agentJob.payload.id}/message`, { prompt: 'Also cover error handling' });
assert.equal(followUp.payload.messages.at(-1).content, 'Also cover error handling');

const v1Jobs = await harness.call('GET', '/v1/agent/proj_emulator/jobs?take=1');
assert.equal(v1Jobs.payload.allSessions[0].sessionId, agentJob.payload.id);

const search = await harness.call('POST', '/discovery/v1/search/emulator', { query: 'api', pageSize: 1 });
assert.equal(search.payload.length, 1);
assert.equal(search.payload[0].path, '/api/reference');

const page = await harness.call('POST', '/discovery/v1/page/emulator', { path: '/quickstart' });
assert.match(page.payload.content, /Get started/);

const message = await harness.call('POST', '/discovery/v2/assistant/emulator/message', {
  fp: 'anonymous',
  messages: [{ id: 'msg_1', role: 'user', parts: [{ type: 'text', text: 'How do I deploy?' }] }],
});
assert.equal(message.payload.role, 'assistant');
assert.match(message.payload.parts[0].text, /How do I deploy/);

const analytics = await harness.call('GET', '/v1/analytics/views');
assert.equal(analytics.payload.data[0].path, '/quickstart');

const state = await harness.call('GET', '/mintlify/inspect/state');
assert.equal(state.payload.updates.length, 2);
assert.equal(state.payload.agentJobs.length, 1);
assert.equal(state.payload.conversations.length, 1);

console.log('mintlify smoke ok');
