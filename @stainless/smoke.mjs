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
  const add = (method, path, handler) => routes.push({ method, path, handler });
  const app = {
    get: (path, handler) => add('GET', path, handler),
    post: (path, handler) => add('POST', path, handler),
    patch: (path, handler) => add('PATCH', path, handler),
    put: (path, handler) => add('PUT', path, handler),
    delete: (path, handler) => add('DELETE', path, handler),
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
assert.equal(contract.provider, 'stainless');

const user = await harness.call('GET', '/v0/user');
assert.equal(user.payload.email, 'ada@example.test');

const orgs = await harness.call('GET', '/v0/orgs');
assert.equal(orgs.payload.data[0].slug, 'acme-corp');

const created = await harness.call('POST', '/v0/projects', {
  slug: 'cli-smoke',
  org: 'acme-corp',
  display_name: 'CLI Smoke',
  targets: ['typescript'],
  revision: { 'openapi.json': '{}' },
});
assert.equal(created.payload.slug, 'cli-smoke');

const project = await harness.call('GET', '/v0/projects/cli-smoke');
assert.equal(project.payload.display_name, 'CLI Smoke');

const updated = await harness.call('PATCH', '/v0/projects/cli-smoke', { display_name: 'CLI Smoke Updated' });
assert.equal(updated.payload.display_name, 'CLI Smoke Updated');

const configs = await harness.call('GET', '/v0/projects/cli-smoke/configs?branch=main&include=openapi');
assert.match(configs.payload['openapi.json'].content, /openapi/);

const guessedConfig = await harness.call('POST', '/v0/projects/cli-smoke/configs/guess', { spec: '{"openapi":"3.1.0"}', branch: 'main' });
assert.match(guessedConfig.payload['stainless.yml'].content, /targets/);

const branch = await harness.call('POST', '/v0/projects/cli-smoke/branches', { branch: 'preview', branch_from: 'main' });
assert.equal(branch.payload.branch, 'preview');

const branches = await harness.call('GET', '/v0/projects/cli-smoke/branches');
assert.equal(branches.payload.data.length, 2);

const branchStatus = await harness.call('GET', '/v0/projects/cli-smoke/branches/preview');
assert.equal(branchStatus.payload.branch, 'preview');

const rebased = await harness.call('PUT', '/v0/projects/cli-smoke/branches/preview/rebase?base=main');
assert.equal(rebased.payload.object, 'project_branch');

const reset = await harness.call('PUT', '/v0/projects/cli-smoke/branches/preview/reset?target_config_sha=cfg_0123');
assert.equal(reset.payload.branch, 'preview');

const build = await harness.call('POST', '/v0/builds', { project: 'cli-smoke', targets: ['typescript'], revision: 'main' });
assert.match(build.payload.id, /^bui_emulator_/);
assert.equal(build.payload.targets.typescript.status, 'completed');

const retrievedBuild = await harness.call('GET', `/v0/builds/${build.payload.id}`);
assert.equal(retrievedBuild.payload.id, build.payload.id);

const builds = await harness.call('GET', '/v0/builds?project=cli-smoke');
assert.ok(builds.payload.data.length >= 1);

const compared = await harness.call('POST', '/v0/builds/compare', { project: 'cli-smoke', targets: ['typescript'], revision: 'main..preview' });
assert.ok(compared.payload.head.id);

const diagnostics = await harness.call('GET', `/v0/builds/${build.payload.id}/diagnostics`);
assert.equal(diagnostics.payload.data[0].level, 'note');

const output = await harness.call('GET', `/v0/build_target_outputs?build_id=${build.payload.id}&target=typescript&output=git&type=source`);
assert.equal(output.payload.output, 'git');
assert.match(output.payload.url, /github\.com\/acme-corp\/cli-smoke-typescript/);

const archiveOutput = await harness.call('GET', `/v0/build_target_outputs?build_id=${build.payload.id}&target=typescript&output=url&type=source`);
assert.equal(archiveOutput.payload.output, 'url');
assert.match(archiveOutput.payload.url, /archive\/3{40}\.tar\.gz$/);

const generated = await harness.call('POST', '/api/generate/spec', {
  project: 'cli-smoke',
  source: { openapi_spec: '{}', stainless_config: 'targets: {}' },
});
assert.deepEqual(generated.payload.spec.diagnostics, {});

const deleted = await harness.call('DELETE', '/v0/projects/cli-smoke/branches/preview');
assert.equal(deleted.payload.deleted, true);

const state = await harness.call('GET', '/stainless/inspect/state');
assert.ok(state.payload.projects.some((item) => item.slug === 'cli-smoke'));

console.log('stainless smoke ok');
