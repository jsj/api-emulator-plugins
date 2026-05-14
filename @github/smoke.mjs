import assert from 'node:assert/strict';
import { plugin, contract, seedFromConfig } from './api-emulator.mjs';

function createHarness() {
  const routes = new Map();
  const data = new Map();
  const app = {
    get: (path, handler) => routes.set(`GET ${path}`, handler),
    post: (path, handler) => routes.set(`POST ${path}`, handler),
    put: (path, handler) => routes.set(`PUT ${path}`, handler),
  };
  plugin.register(app, {
    getData: (key) => data.get(key),
    setData: (key, value) => data.set(key, value),
  });
  return {
    store: {
      getData: (key) => data.get(key),
      setData: (key, value) => data.set(key, value),
    },
    async call(method, path, body = {}, params = {}) {
      const handler = routes.get(`${method} ${path}`);
      assert.ok(handler, `missing route ${method} ${path}`);
      let status = 200;
      let payload;
      const headers = new Headers();
      await handler({
        req: {
          json: async () => body,
          url: `https://github.local${path}`,
          param: (name) => params[name],
          query: (name) => params.query?.[name],
        },
        json: (value, nextStatus = 200) => {
          status = nextStatus;
          payload = value;
          return { status, payload, headers };
        },
        body: (_, nextStatus = 204) => {
          status = nextStatus;
          payload = null;
          return { status, payload, headers };
        },
      });
      return { status, payload, headers };
    },
  };
}

const harness = createHarness();
assert.equal(contract.provider, 'github');
assert.equal(contract.openapiRouteCount, 1183);
const user = await harness.call('GET', '/user');
assert.equal(user.payload.login, 'jsj');
const repos = await harness.call('GET', '/user/repos');
assert.equal(repos.payload.length, 1);
seedFromConfig(harness.store, '', {
  repositories: [{
    full_name: 'octo/hello',
    stargazers: [
      { login: 'public-email', name: 'Public Email', email: 'public@example.com' },
      { login: 'private-email', name: 'Private Email', email: null },
    ],
  }],
});
const stargazers = await harness.call('GET', '/repos/:owner/:repo/stargazers', {}, { owner: 'octo', repo: 'hello', query: { per_page: '1' } });
assert.equal(stargazers.payload.length, 1);
assert.match(stargazers.headers.get('Link'), /rel="next"/);
const profile = await harness.call('GET', '/users/:username', {}, { username: 'public-email' });
assert.equal(profile.payload.email, 'public@example.com');
const search = await harness.call('GET', '/search/repositories', {}, { query: { q: 'vibetrade' } });
assert.equal(search.payload.items.length, 1);
const token = await harness.call('POST', '/app/installations/:installationId/access_tokens', {}, { installationId: '42' });
assert.match(token.payload.token, /github-emulator-installation-token-42/);
const tree = await harness.call('GET', '/repos/:owner/:repo/git/trees/:treeSha', {}, { owner: 'octo', repo: 'hello', treeSha: 'HEAD' });
assert.equal(tree.payload.truncated, false);
const issue = await harness.call('POST', '/repos/:owner/:repo/issues', { title: 'Smoke' }, { owner: 'octo', repo: 'hello' });
assert.equal(issue.payload.number, 1);
await harness.call('POST', '/repos/:owner/:repo/actions/workflows/:workflowId/dispatches', { ref: 'main' }, {
  owner: 'octo',
  repo: 'hello',
  workflowId: 'ci.yml',
});
const runs = await harness.call('GET', '/inspect/workflow-runs');
assert.equal(runs.payload.length, 1);

console.log('github smoke ok');
