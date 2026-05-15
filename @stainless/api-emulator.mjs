const STATE_KEY = 'stainless:state';
const NOW = '2026-05-15T12:00:00Z';

function initialState(config = {}) {
  return {
    orgs: [{ object: 'org', slug: 'acme-corp', display_name: 'Acme Corp' }],
    user: { object: 'user', id: 'usr_emulator', name: 'Ada Lovelace', email: 'ada@example.test', orgs: ['acme-corp'] },
    projects: [
      {
        object: 'project',
        slug: 'acme-api',
        display_name: 'Acme API',
        org: 'acme-corp',
        config_repo: 'https://github.com/acme-corp/acme-api',
        targets: ['typescript', 'python', 'go'],
      },
    ],
    branches: {
      'acme-api': [{ object: 'project_branch', branch: 'main', config_commit: 'cfg_0123456789abcdef' }],
    },
    configs: {
      'stainless.yml': { content: 'targets:\n  typescript:\n  python:\n' },
      'openapi.json': { content: '{"openapi":"3.1.0","info":{"title":"Acme API","version":"1.0.0"},"paths":{}}' },
    },
    builds: [
      makeBuild('bui_emulator_000001', {
        project: 'acme-api',
        targets: {
          typescript: completedTarget('acme-corp', 'acme-api-typescript', '1111111111111111111111111111111111111111'),
          python: completedTarget('acme-corp', 'acme-api-python', '2222222222222222222222222222222222222222'),
        },
      }),
    ],
    diagnostics: {
      bui_emulator_000001: [
        { code: 'example-valid', level: 'note', message: 'OpenAPI document parsed successfully.', ignored: false, more: null },
      ],
    },
    oauth: { deviceCodes: [] },
    nextId: 2,
    ...config,
  };
}

function completedTarget(owner, repo, sha) {
  return {
    object: 'build_target',
    status: 'completed',
    install_url: `https://pkg.stainless.com/${owner}/${repo}`,
    commit: {
      status: 'completed',
      conclusion: 'success',
      commit: {
        sha,
        tree_oid: `tree_${sha.slice(0, 7)}`,
        repo: { owner, name: repo },
        stats: { additions: 12, deletions: 1, total: 13 },
      },
    },
    lint: { status: 'completed', conclusion: 'success', url: '' },
    build: { status: 'completed', conclusion: 'success', url: '' },
    test: { status: 'completed', conclusion: 'success', url: '' },
  };
}

function makeBuild(id, patch = {}) {
  return {
    id,
    object: 'build',
    config_commit: 'cfg_0123456789abcdef',
    created_at: NOW,
    org: 'acme-corp',
    project: 'acme-api',
    targets: {},
    ...patch,
  };
}

function state(store) {
  const current = store.getData?.(STATE_KEY);
  if (current) return current;
  const seeded = initialState();
  store.setData?.(STATE_KEY, seeded);
  return seeded;
}

function saveState(store, next) {
  store.setData?.(STATE_KEY, next);
}

async function readJson(c) {
  return c.req.json().catch(() => ({}));
}

function page(data) {
  return { data, next_cursor: '', has_more: false };
}

function stainlessError(c, message, status = 400) {
  return c.json({ error: { message, type: status === 404 ? 'not_found_error' : 'invalid_request_error' } }, status);
}

function findProject(s, slug) {
  return s.projects.find((project) => project.slug === slug);
}

function ensureProject(s, slug) {
  let project = findProject(s, slug);
  if (!project) {
    project = {
      object: 'project',
      slug,
      display_name: slug,
      org: 'acme-corp',
      config_repo: `https://github.com/acme-corp/${slug}`,
      targets: ['typescript'],
    };
    s.projects.push(project);
  }
  return project;
}

function nextBuild(s, body = {}) {
  const id = `bui_emulator_${String(s.nextId++).padStart(6, '0')}`;
  const project = body.project ?? 'acme-api';
  const targets = Object.fromEntries((body.targets?.length ? body.targets : ['typescript']).map((target, index) => [
    target,
    completedTarget('acme-corp', `${project}-${target}`, String(index + 3).repeat(40)),
  ]));
  const build = makeBuild(id, {
    project,
    targets,
    created_at: new Date().toISOString(),
    config_commit: `cfg_${String(s.nextId).padStart(16, '0')}`,
  });
  s.builds.unshift(build);
  s.diagnostics[id] = [{ code: 'build-created', level: 'note', message: 'Emulator build completed successfully.', ignored: false, more: null }];
  return build;
}

export const contract = {
  provider: 'stainless',
  source: 'Stainless official generated CLI and SDK contract',
  docs: 'https://www.stainless.com/docs/getting-started/quickstart-cli',
  baseUrl: 'https://api.stainless.com',
  scope: ['user', 'orgs', 'projects', 'project-branches', 'project-configs', 'builds', 'diagnostics', 'target-outputs', 'oauth-device'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'stainless',
  register(app, store) {
    app.get('/health', (c) => c.json({ ok: true }));
    app.post('/api/oauth/device', (c) => c.json({
      device_code: 'demo_device_code_abc123',
      user_code: 'DEMO-CODE',
      verification_uri: 'https://app.stainless.com/activate',
      verification_uri_complete: 'https://app.stainless.com/activate?code=DEMO-CODE',
      expires_in: 300,
      interval: 1,
    }));
    app.post('/v0/oauth/token', (c) => c.json({ access_token: 'stl_emulator_token', refresh_token: 'stl_emulator_refresh', token_type: 'bearer' }));

    app.get('/v0/user', (c) => c.json(state(store).user));
    app.get('/v0/orgs', (c) => c.json(page(state(store).orgs)));

    app.get('/v0/projects', (c) => {
      const s = state(store);
      const org = c.req.query?.('org');
      const rows = org ? s.projects.filter((project) => project.org === org) : s.projects;
      return c.json(page(rows));
    });

    app.post('/v0/projects', async (c) => {
      const body = await readJson(c);
      if (!body.slug) return stainlessError(c, 'slug is required');
      if (!body.org) return stainlessError(c, 'org is required');
      const s = state(store);
      const project = {
        object: 'project',
        slug: body.slug,
        display_name: body.display_name ?? body.slug,
        org: body.org,
        config_repo: `https://github.com/${body.org}/${body.slug}`,
        targets: body.targets ?? ['typescript', 'python'],
      };
      s.projects = s.projects.filter((item) => item.slug !== project.slug);
      s.projects.push(project);
      s.branches[project.slug] = [{ object: 'project_branch', branch: 'main', config_commit: 'cfg_0123456789abcdef' }];
      nextBuild(s, { project: project.slug, targets: project.targets });
      saveState(store, s);
      return c.json(project);
    });

    app.get('/v0/projects/:project', (c) => {
      const project = findProject(state(store), c.req.param('project'));
      return project ? c.json(project) : stainlessError(c, 'project not found', 404);
    });

    app.patch('/v0/projects/:project', async (c) => {
      const body = await readJson(c);
      const s = state(store);
      const project = ensureProject(s, c.req.param('project'));
      if (body.display_name) project.display_name = body.display_name;
      saveState(store, s);
      return c.json(project);
    });

    app.post('/v0/projects/:project/generate_commit_message', (c) => c.json({ message: 'Update generated SDKs' }));

    app.get('/v0/projects/:project/configs', (c) => c.json(state(store).configs));
    app.post('/v0/projects/:project/configs/guess', (c) => c.json({ 'stainless.yml': { content: '# guessed by emulator\ntargets:\n  typescript:\n' } }));

    app.post('/v0/projects/:project/branches', async (c) => {
      const body = await readJson(c);
      if (!body.branch) return stainlessError(c, 'branch is required');
      const s = state(store);
      const project = c.req.param('project');
      ensureProject(s, project);
      s.branches[project] ??= [];
      const branch = { object: 'project_branch', branch: body.branch, branch_from: body.branch_from ?? 'main', config_commit: 'cfg_branch_abcdef' };
      s.branches[project] = s.branches[project].filter((item) => item.branch !== body.branch);
      s.branches[project].push(branch);
      saveState(store, s);
      return c.json(branch);
    });

    app.get('/v0/projects/:project/branches', (c) => c.json(page(state(store).branches[c.req.param('project')] ?? [])));
    app.get('/v0/projects/:project/branches/:branch', (c) => {
      const branch = (state(store).branches[c.req.param('project')] ?? []).find((item) => item.branch === c.req.param('branch'));
      return branch ? c.json(branch) : stainlessError(c, 'branch not found', 404);
    });
    app.delete('/v0/projects/:project/branches/:branch', (c) => {
      const s = state(store);
      const project = c.req.param('project');
      s.branches[project] = (s.branches[project] ?? []).filter((item) => item.branch !== c.req.param('branch'));
      saveState(store, s);
      return c.json({ deleted: true });
    });
    app.put('/v0/projects/:project/branches/:branch/rebase', (c) => c.json({ object: 'project_branch', branch: c.req.param('branch') }));
    app.put('/v0/projects/:project/branches/:branch/reset', (c) => c.json({ object: 'project_branch', branch: c.req.param('branch') }));

    app.get('/v0/builds', (c) => {
      const project = c.req.query?.('project');
      if (!project) return stainlessError(c, 'project is required');
      return c.json(page(state(store).builds.filter((build) => build.project === project)));
    });
    app.post('/v0/builds', async (c) => {
      const body = await readJson(c);
      if (!body.project) return stainlessError(c, 'project is required');
      const s = state(store);
      ensureProject(s, body.project);
      const build = nextBuild(s, body);
      saveState(store, s);
      return c.json(build);
    });
    app.get('/v0/builds/:id', (c) => {
      const build = state(store).builds.find((item) => item.id === c.req.param('id'));
      return build ? c.json(build) : stainlessError(c, 'build not found', 404);
    });
    app.get('/v0/builds/:id/diagnostics', (c) => c.json(page(state(store).diagnostics[c.req.param('id')] ?? [])));
    app.post('/v0/builds/compare', async (c) => {
      const body = await readJson(c);
      if (!body.project) return stainlessError(c, 'project is required');
      const s = state(store);
      const head = nextBuild(s, body);
      saveState(store, s);
      return c.json({ base: s.builds[s.builds.length - 1], head });
    });

    app.get('/v0/build_target_outputs', (c) => {
      const s = state(store);
      const build = s.builds.find((item) => item.id === c.req.query?.('build_id')) ?? s.builds[0];
      const target = c.req.query?.('target') ?? Object.keys(build.targets)[0];
      const output = c.req.query?.('output') ?? 'url';
      const repo = build.targets[target]?.commit?.commit?.repo ?? { owner: 'acme-corp', name: `${build.project}-${target}` };
      const sha = build.targets[target]?.commit?.commit?.sha ?? '0123456789abcdef0123456789abcdef01234567';
      return c.json(output === 'git'
        ? { output: 'git', target, type: c.req.query?.('type') ?? 'source', url: `https://github.com/${repo.owner}/${repo.name}`, ref: sha, token: 'stl_emulator_git_token' }
        : { output: 'url', target, type: c.req.query?.('type') ?? 'source', url: `https://github.com/${repo.owner}/${repo.name}/archive/${sha}.tar.gz` });
    });

    app.post('/api/generate/spec', async (c) => {
      const body = await readJson(c);
      if (!body.project || !body.source?.openapi_spec || !body.source?.stainless_config) {
        return stainlessError(c, 'project, openapi_spec, and stainless_config are required');
      }
      return c.json({ spec: { diagnostics: {} } });
    });

    app.get('/stainless/inspect/contract', (c) => c.json(contract));
    app.get('/stainless/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Stainless API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { stainless: initialState() };
