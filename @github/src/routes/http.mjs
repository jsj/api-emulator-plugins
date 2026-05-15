const DEFAULT_OWNER = 'jsj';
const DEFAULT_REPO = 'vibetrade-monorepo';
const DEFAULT_BRANCH = 'main';

function now() {
  return new Date().toISOString();
}

function githubState(store) {
  const state = store.getData?.('github:state');
  if (state) return state;

  const initial = {
    repositories: {},
    issues: [],
    pullRequests: [],
    workflowDispatches: [],
    workflowRuns: [],
    workflowJobs: [],
    artifacts: [],
    checkRuns: [],
    webhooks: [],
    statuses: [],
    installationTokens: [],
    users: {},
    stargazers: {},
    nextIssueNumber: 1,
    nextPullNumber: 1,
    nextRunId: 1000,
    nextJobId: 1500,
    nextArtifactId: 1700,
    nextCheckRunId: 2000,
    nextWebhookId: 3000,
    nextRepoId: 4000,
  };
  ensureRepository(initial, DEFAULT_OWNER, DEFAULT_REPO);
  ensureUser(initial, DEFAULT_OWNER, { name: 'GitHub Emulator' });
  store.setData?.('github:state', initial);
  return initial;
}

function saveState(store, state) {
  store.setData?.('github:state', state);
}

function repoFullName(owner = DEFAULT_OWNER, repo = DEFAULT_REPO) {
  return `${owner}/${repo}`;
}

function requestOrigin(c) {
  try {
    return new URL(c.req.url).origin;
  } catch {
    return 'https://api.github.com';
  }
}

function ensureUser(state, login, spec = {}) {
  state.users ??= {};
  if (!state.users[login]) {
    state.users[login] = {
      login,
      id: Object.keys(state.users).length + 1,
      node_id: `github-emulator-user-${login}`,
      avatar_url: `https://avatars.githubusercontent.com/u/${Object.keys(state.users).length + 1}?v=4`,
      gravatar_id: '',
      url: `https://api.github.com/users/${login}`,
      html_url: `https://github.com/${login}`,
      type: 'User',
      site_admin: false,
      name: null,
      email: null,
      company: null,
      blog: '',
      location: null,
      bio: null,
      public_repos: 0,
      public_gists: 0,
      followers: 0,
      following: 0,
      created_at: now(),
      updated_at: now(),
    };
  }

  Object.assign(state.users[login], {
    ...spec,
    login,
    url: spec.url ?? `https://api.github.com/users/${login}`,
    html_url: spec.html_url ?? `https://github.com/${login}`,
  });
  return state.users[login];
}

function seedStargazers(state, repo, stargazers = []) {
  state.stargazers ??= {};
  const fullName = repo.full_name;
  const logins = [];

  for (const entry of stargazers) {
    const spec = typeof entry === 'string' ? { login: entry } : entry;
    if (!spec?.login) continue;
    ensureUser(state, spec.login, spec);
    logins.push(spec.login);
  }

  state.stargazers[fullName] = logins;
  repo.stargazers_count = logins.length;
}

function parseLabels(labels) {
  if (!Array.isArray(labels)) return [];
  return labels.map((label) => {
    if (typeof label === 'string') return { name: label };
    return { name: label?.name ?? String(label) };
  });
}

function ensureRepository(state, owner = DEFAULT_OWNER, repo = DEFAULT_REPO) {
  const fullName = repoFullName(owner, repo);
  if (!state.repositories[fullName]) {
    state.nextRepoId ??= 4000;
    state.repositories[fullName] = {
      id: state.nextRepoId++,
      name: repo,
      full_name: fullName,
      description: null,
      stargazers_count: 0,
      owner: { login: owner, type: 'User' },
      default_branch: DEFAULT_BRANCH,
      private: false,
      refs: {
        [`heads/${DEFAULT_BRANCH}`]: {
          ref: `refs/heads/${DEFAULT_BRANCH}`,
          object: { type: 'commit', sha: 'github-emulator-main-sha', url: `https://api.github.com/repos/${fullName}/git/commits/github-emulator-main-sha` },
        },
      },
      contents: {},
      workflows: {
        'generate-appclip-code.yml': {
          id: 1,
          name: 'Generate App Clip Code',
          path: '.github/workflows/generate-appclip-code.yml',
          state: 'active',
        },
      },
      created_at: now(),
      updated_at: now(),
      pushed_at: now(),
    };
  }
  return state.repositories[fullName];
}

function currentUser() {
  return {
    login: DEFAULT_OWNER,
    id: 1,
    node_id: 'github-emulator-user-node',
    avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    gravatar_id: '',
    url: 'https://api.github.com/user',
    html_url: `https://github.com/${DEFAULT_OWNER}`,
    type: 'User',
    site_admin: false,
    name: 'GitHub Emulator',
  };
}

function listRepositories(state) {
  return Object.values(state.repositories).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function contentName(path) {
  const parts = String(path ?? '').split('/').filter(Boolean);
  return parts.at(-1) ?? '';
}

function asDirectoryEntry(repo, path) {
  return {
    name: contentName(path),
    path,
    sha: `${path || 'root'}-sha`,
    size: 0,
    url: `https://api.github.com/repos/${repo.full_name}/contents/${path}`,
    html_url: `https://github.com/${repo.full_name}/tree/${repo.default_branch}/${path}`,
    git_url: `https://api.github.com/repos/${repo.full_name}/git/trees/${path || 'root'}-sha`,
    download_url: null,
    type: 'dir',
  };
}

function inferDirectoryContents(repo, directoryPath = '') {
  const prefix = directoryPath ? `${directoryPath.replace(/\/+$/, '')}/` : '';
  const children = new Map();

  for (const [path, content] of Object.entries(repo.contents)) {
    if (directoryPath && !path.startsWith(prefix)) continue;
    const rest = path.slice(prefix.length);
    if (!rest || rest === path && directoryPath) continue;
    const [first, ...remaining] = rest.split('/');
    const childPath = prefix + first;
    children.set(childPath, remaining.length === 0 ? content : asDirectoryEntry(repo, childPath));
  }

  return [...children.values()].sort((a, b) => String(a.path).localeCompare(String(b.path)));
}

function treeForRepository(repo) {
  const entries = new Map();
  for (const [path, content] of Object.entries(repo.contents)) {
    const parts = path.split('/').filter(Boolean);
    for (let index = 1; index < parts.length; index++) {
      const dir = parts.slice(0, index).join('/');
      entries.set(dir, {
        path: dir,
        mode: '040000',
        type: 'tree',
        sha: `${dir}-tree-sha`,
        url: `https://api.github.com/repos/${repo.full_name}/git/trees/${dir}-tree-sha`,
      });
    }
    entries.set(path, {
      path,
      mode: content.mode ?? (content.type === 'dir' ? '040000' : '100644'),
      type: content.type === 'dir' ? 'tree' : 'blob',
      sha: content.sha ?? `${path}-sha`,
      size: content.size ?? 0,
      url: content.git_url ?? `https://api.github.com/repos/${repo.full_name}/git/blobs/${content.sha ?? `${path}-sha`}`,
    });
  }
  return {
    sha: 'github-emulator-main-sha',
    url: `https://api.github.com/repos/${repo.full_name}/git/trees/github-emulator-main-sha`,
    tree: [...entries.values()].sort((a, b) => a.path.localeCompare(b.path)),
    truncated: false,
  };
}

function normalizeSeedContent(repo, path, value) {
  const type = value?.type ?? 'file';
  const sha = value?.sha ?? `${path}-sha`;
  return {
    name: value?.name ?? contentName(path),
    path,
    sha,
    type,
    size: value?.size ?? (type === 'file' ? String(value?.content ?? '').length : 0),
    encoding: value?.encoding,
    content: value?.content,
    url: value?.url ?? `https://api.github.com/repos/${repo.full_name}/contents/${path}`,
    html_url: value?.html_url ?? `https://github.com/${repo.full_name}/blob/${repo.default_branch}/${path}`,
    git_url: value?.git_url ?? `https://api.github.com/repos/${repo.full_name}/git/blobs/${sha}`,
    download_url: value?.download_url ?? (type === 'file' ? `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch}/${path}` : null),
    target: value?.target,
    submodule_git_url: value?.submodule_git_url,
    mode: value?.mode,
  };
}

function seedRepository(repo, spec = {}) {
  repo.id = spec.id ?? repo.id;
  repo.private = spec.private ?? repo.private;
  repo.description = spec.description ?? repo.description;
  repo.stargazers_count = spec.stargazers_count ?? spec.stargazersCount ?? repo.stargazers_count ?? 0;
  repo.default_branch = spec.default_branch ?? spec.defaultBranch ?? repo.default_branch;
  repo.updated_at = spec.updated_at ?? now();
  repo.pushed_at = spec.pushed_at ?? spec.pushedAt ?? repo.updated_at;

  for (const [path, value] of Object.entries(spec.contents ?? {})) {
    repo.contents[path] = normalizeSeedContent(repo, path, value);
  }
}

function genericOpenApiPayload(c) {
  return {
    message: 'GitHub emulator generic OpenAPI-compatible response',
    method: c.req.method ?? 'GET',
    path: c.req.path ?? c.req.url ?? c.req.param?.('*') ?? '/',
    documentation_url: 'https://docs.github.com/en/rest',
  };
}

function workflowRunFromDispatch(state, dispatch) {
  const runId = state.nextRunId++;
  return {
    id: runId,
    name: dispatch.workflowId,
    head_branch: dispatch.ref,
    head_sha: 'github-emulator-main-sha',
    path: `.github/workflows/${dispatch.workflowId}`,
    run_number: runId,
    event: 'workflow_dispatch',
    status: 'queued',
    conclusion: null,
    workflow_id: dispatch.workflowId,
    html_url: `https://github.com/${dispatch.repo}/actions/runs/${runId}`,
    created_at: now(),
    updated_at: now(),
    inputs: dispatch.inputs,
  };
}

function createWorkflowJob(state, dispatch, run) {
  return {
    id: state.nextJobId++,
    run_id: run.id,
    run_url: `https://api.github.com/repos/${dispatch.repo}/actions/runs/${run.id}`,
    status: run.status,
    conclusion: run.conclusion,
    name: 'emulator-job',
    started_at: run.status === 'queued' ? null : now(),
    completed_at: run.conclusion ? now() : null,
    steps: [
      { name: 'Set up job', status: 'completed', conclusion: 'success', number: 1 },
      { name: 'Run emulator task', status: run.status, conclusion: run.conclusion, number: 2 },
    ],
  };
}

function issueResource(owner, repo, number, body) {
  return {
    id: number,
    number,
    title: body.title ?? 'Untitled emulator issue',
    body: body.body ?? '',
    state: 'open',
    labels: parseLabels(body.labels),
    html_url: `https://github.com/${owner}/${repo}/issues/${number}`,
    repository_url: `https://api.github.com/repos/${owner}/${repo}`,
    created_at: now(),
    updated_at: now(),
    user: { login: 'github-emulator[bot]', type: 'Bot' },
  };
}

export function registerRoutes(app, store, contract) {
  app.get('/user', (c) => c.json(currentUser()));

  app.get('/users/:username', (c) => {
    const state = githubState(store);
    const user = state.users?.[c.req.param('username')];
    if (!user) return c.json({ message: 'Not Found' }, 404);
    return c.json(user);
  });

  app.get('/user/orgs', (c) => c.json([]));

  app.get('/user/repos', (c) => {
    const state = githubState(store);
    const limit = Number(c.req.query?.('per_page') ?? 100);
    const repos = listRepositories(state);
    return c.json(repos.slice(0, Number.isFinite(limit) ? limit : 100));
  });

  app.get('/search/repositories', (c) => {
    const state = githubState(store);
    const query = String(c.req.query?.('q') ?? '').toLowerCase();
    const repos = listRepositories(state).filter((repo) => {
      if (!query) return true;
      return repo.full_name.toLowerCase().includes(query) || repo.name.toLowerCase().includes(query);
    });
    return c.json({ total_count: repos.length, incomplete_results: false, items: repos });
  });

  app.post('/app/installations/:installationId/access_tokens', (c) => {
    const state = githubState(store);
    const installationId = c.req.param('installationId');
    const token = {
      token: `github-emulator-installation-token-${installationId}`,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      permissions: { issues: 'write', actions: 'write', contents: 'read' },
      repository_selection: 'selected',
      issuedAt: now(),
    };
    state.installationTokens.push({ installationId, token });
    saveState(store, state);
    return c.json(token, 201);
  });

  app.post('/repos/:owner/:repo/issues', async (c) => {
    const state = githubState(store);
    const owner = c.req.param('owner');
    const repo = c.req.param('repo');
    ensureRepository(state, owner, repo);
    const body = await c.req.json().catch(() => ({}));
    const number = state.nextIssueNumber++;
    const issue = issueResource(owner, repo, number, body);
    state.issues.push({ repo: repoFullName(owner, repo), issue });
    saveState(store, state);
    return c.json(issue, 201);
  });

  app.get('/repos/:owner/:repo/issues', (c) => {
    const state = githubState(store);
    const owner = c.req.param('owner');
    const repo = c.req.param('repo');
    const label = c.req.query('labels');
    const limit = Number(c.req.query('per_page') ?? 30);
    let issues = state.issues
      .filter((entry) => entry.repo === repoFullName(owner, repo))
      .map((entry) => entry.issue)
      .filter((issue) => issue.state === 'open');

    if (label) {
      const names = new Set(label.split(',').map((value) => value.trim()));
      issues = issues.filter((issue) => issue.labels.some((item) => names.has(item.name)));
    }

    return c.json(issues.slice(0, Number.isFinite(limit) ? limit : 30));
  });

  app.get('/repos/:owner/:repo', (c) => {
    const state = githubState(store);
    return c.json(ensureRepository(state, c.req.param('owner'), c.req.param('repo')));
  });

  app.get('/repos/:owner/:repo/stargazers', (c) => {
    const state = githubState(store);
    const owner = c.req.param('owner');
    const repoName = c.req.param('repo');
    const repo = ensureRepository(state, owner, repoName);
    const page = Math.max(1, Number(c.req.query?.('page') ?? 1));
    const perPage = Math.max(1, Math.min(100, Number(c.req.query?.('per_page') ?? 30)));
    const logins = state.stargazers?.[repo.full_name] ?? [];
    const start = (page - 1) * perPage;
    const users = logins.slice(start, start + perPage).map((login) => ensureUser(state, login));
    const lastPage = Math.ceil(logins.length / perPage);
    const links = [];

    if (page < lastPage) {
      const origin = requestOrigin(c);
      links.push(`<${origin}/repos/${repo.full_name}/stargazers?per_page=${perPage}&page=${page + 1}>; rel="next"`);
      links.push(`<${origin}/repos/${repo.full_name}/stargazers?per_page=${perPage}&page=${lastPage}>; rel="last"`);
    }

    const response = c.json(users);
    if (links.length > 0) {
      response.headers?.set?.('Link', links.join(', '));
    }
    return response;
  });

  app.get('/repos/:owner/:repo/branches', (c) => {
    const state = githubState(store);
    const repo = ensureRepository(state, c.req.param('owner'), c.req.param('repo'));
    return c.json(Object.entries(repo.refs)
      .filter(([ref]) => ref.startsWith('heads/'))
      .map(([ref, value]) => ({ name: ref.replace(/^heads\//, ''), commit: value.object, protected: false })));
  });

  app.get('/repos/:owner/:repo/branches/:branch', (c) => {
    const state = githubState(store);
    const repo = ensureRepository(state, c.req.param('owner'), c.req.param('repo'));
    const ref = repo.refs[`heads/${c.req.param('branch')}`];
    if (!ref) return c.json({ message: 'Branch not found' }, 404);
    return c.json({ name: c.req.param('branch'), commit: ref.object, protected: false });
  });

  app.get('/repos/:owner/:repo/commits/:ref', (c) => {
    const state = githubState(store);
    const repo = ensureRepository(state, c.req.param('owner'), c.req.param('repo'));
    const ref = c.req.param('ref');
    return c.json({
      sha: ref,
      html_url: `https://github.com/${repo.full_name}/commit/${ref}`,
      commit: {
        message: 'emulator commit',
        author: { name: 'GitHub Emulator', email: 'emulator@github.local', date: now() },
      },
      parents: [],
    });
  });

  app.get('/repos/:owner/:repo/git/ref/:ref{.*}', (c) => {
    const state = githubState(store);
    const repo = ensureRepository(state, c.req.param('owner'), c.req.param('repo'));
    const ref = c.req.param('ref');
    const resource = repo.refs[ref] ?? repo.refs[`heads/${ref}`];
    if (!resource) return c.json({ message: 'Reference not found' }, 404);
    return c.json(resource);
  });

  app.post('/repos/:owner/:repo/git/refs', async (c) => {
    const state = githubState(store);
    const repo = ensureRepository(state, c.req.param('owner'), c.req.param('repo'));
    const body = await c.req.json().catch(() => ({}));
    const refName = String(body.ref ?? '').replace(/^refs\//, '');
    if (!refName || !body.sha) return c.json({ message: 'ref and sha are required' }, 422);
    repo.refs[refName] = { ref: `refs/${refName}`, object: { type: 'commit', sha: body.sha, url: `https://api.github.com/repos/${repo.full_name}/git/commits/${body.sha}` } };
    saveState(store, state);
    return c.json(repo.refs[refName], 201);
  });

  app.get('/repos/:owner/:repo/contents/:path{.*}', (c) => {
    const state = githubState(store);
    const repo = ensureRepository(state, c.req.param('owner'), c.req.param('repo'));
    const path = c.req.param('path');
    const content = repo.contents[path];
    if (!content) {
      const directory = inferDirectoryContents(repo, path);
      if (directory.length > 0) return c.json(directory);
      return c.json({ message: 'Not Found' }, 404);
    }
    return c.json(content);
  });

  app.get('/repos/:owner/:repo/contents', (c) => {
    const state = githubState(store);
    const repo = ensureRepository(state, c.req.param('owner'), c.req.param('repo'));
    return c.json(inferDirectoryContents(repo, ''));
  });

  app.get('/repos/:owner/:repo/git/trees/:treeSha', (c) => {
    const state = githubState(store);
    const repo = ensureRepository(state, c.req.param('owner'), c.req.param('repo'));
    return c.json(treeForRepository(repo));
  });

  app.get('/repos/:owner/:repo/git/trees/:treeSha{.*}', (c) => {
    const state = githubState(store);
    const repo = ensureRepository(state, c.req.param('owner'), c.req.param('repo'));
    return c.json(treeForRepository(repo));
  });

  app.put('/repos/:owner/:repo/contents/:path{.*}', async (c) => {
    const state = githubState(store);
    const repo = ensureRepository(state, c.req.param('owner'), c.req.param('repo'));
    const path = c.req.param('path');
    const body = await c.req.json().catch(() => ({}));
    const sha = crypto.randomUUID().replaceAll('-', '');
    const content = {
      name: path.split('/').at(-1),
      path,
      sha,
      type: 'file',
      size: String(body.content ?? '').length,
      encoding: 'base64',
      content: body.content ?? '',
      url: `https://api.github.com/repos/${repo.full_name}/contents/${path}`,
      html_url: `https://github.com/${repo.full_name}/blob/${body.branch ?? repo.default_branch}/${path}`,
      git_url: `https://api.github.com/repos/${repo.full_name}/git/blobs/${sha}`,
      download_url: `https://raw.githubusercontent.com/${repo.full_name}/${body.branch ?? repo.default_branch}/${path}`,
    };
    repo.contents[path] = content;
    repo.updated_at = now();
    saveState(store, state);
    return c.json({ content, commit: { sha, message: body.message ?? 'emulator commit' } }, 201);
  });

  app.post('/repos/:owner/:repo/pulls', async (c) => {
    const state = githubState(store);
    const owner = c.req.param('owner');
    const repo = c.req.param('repo');
    ensureRepository(state, owner, repo);
    const body = await c.req.json().catch(() => ({}));
    const number = state.nextPullNumber++;
    const pull = {
      id: number,
      number,
      state: 'open',
      title: body.title ?? 'Untitled emulator pull request',
      body: body.body ?? '',
      head: { ref: body.head ?? 'emulator-head', sha: 'github-emulator-head-sha' },
      base: { ref: body.base ?? DEFAULT_BRANCH, sha: 'github-emulator-main-sha' },
      html_url: `https://github.com/${owner}/${repo}/pull/${number}`,
      created_at: now(),
      updated_at: now(),
    };
    state.pullRequests.push({ repo: repoFullName(owner, repo), pull });
    saveState(store, state);
    return c.json(pull, 201);
  });

  app.get('/repos/:owner/:repo/pulls', (c) => {
    const state = githubState(store);
    const repo = repoFullName(c.req.param('owner'), c.req.param('repo'));
    return c.json(state.pullRequests.filter((entry) => entry.repo === repo).map((entry) => entry.pull));
  });

  app.get('/repos/:owner/:repo/pulls/:pullNumber', (c) => {
    const state = githubState(store);
    const repo = repoFullName(c.req.param('owner'), c.req.param('repo'));
    const pull = state.pullRequests.find((entry) => entry.repo === repo && entry.pull.number === Number(c.req.param('pullNumber')))?.pull;
    if (!pull) return c.json({ message: 'Not Found' }, 404);
    return c.json(pull);
  });

  app.put('/repos/:owner/:repo/pulls/:pullNumber/merge', async (c) => {
    const state = githubState(store);
    const repo = repoFullName(c.req.param('owner'), c.req.param('repo'));
    const entry = state.pullRequests.find((item) => item.repo === repo && item.pull.number === Number(c.req.param('pullNumber')));
    if (!entry) return c.json({ message: 'Not Found' }, 404);
    entry.pull.state = 'closed';
    entry.pull.merged = true;
    entry.pull.merged_at = now();
    saveState(store, state);
    return c.json({ sha: crypto.randomUUID().replaceAll('-', ''), merged: true, message: 'Pull Request successfully merged' });
  });

  app.post('/repos/:owner/:repo/actions/workflows/:workflowId/dispatches', async (c) => {
    const state = githubState(store);
    const owner = c.req.param('owner');
    const repo = c.req.param('repo');
    const workflowId = c.req.param('workflowId');
    const body = await c.req.json().catch(() => ({}));
    const dispatch = {
      id: crypto.randomUUID(),
      repo: repoFullName(owner, repo),
      workflowId,
      ref: body.ref ?? 'main',
      inputs: body.inputs ?? {},
      dispatchedAt: now(),
    };
    state.workflowDispatches.push(dispatch);
    const run = workflowRunFromDispatch(state, dispatch);
    state.workflowRuns.push({ repo: dispatch.repo, run });
    state.workflowJobs.push({ repo: dispatch.repo, job: createWorkflowJob(state, dispatch, run) });
    saveState(store, state);
    return new Response(null, { status: 204 });
  });

  app.get('/repos/:owner/:repo/actions/runs', (c) => {
    const state = githubState(store);
    const repo = repoFullName(c.req.param('owner'), c.req.param('repo'));
    return c.json({ total_count: state.workflowRuns.filter((entry) => entry.repo === repo).length, workflow_runs: state.workflowRuns.filter((entry) => entry.repo === repo).map((entry) => entry.run) });
  });

  app.get('/repos/:owner/:repo/actions/runs/:runId', (c) => {
    const state = githubState(store);
    const repo = repoFullName(c.req.param('owner'), c.req.param('repo'));
    const run = state.workflowRuns.find((entry) => entry.repo === repo && entry.run.id === Number(c.req.param('runId')))?.run;
    if (!run) return c.json({ message: 'Not Found' }, 404);
    return c.json(run);
  });

  app.get('/repos/:owner/:repo/actions/runs/:runId/jobs', (c) => {
    const state = githubState(store);
    const repo = repoFullName(c.req.param('owner'), c.req.param('repo'));
    const jobs = state.workflowJobs.filter((entry) => entry.repo === repo && entry.job.run_id === Number(c.req.param('runId'))).map((entry) => entry.job);
    return c.json({ total_count: jobs.length, jobs });
  });

  app.get('/repos/:owner/:repo/actions/runs/:runId/artifacts', (c) => {
    const state = githubState(store);
    const repo = repoFullName(c.req.param('owner'), c.req.param('repo'));
    const artifacts = state.artifacts.filter((entry) => entry.repo === repo && entry.artifact.workflow_run?.id === Number(c.req.param('runId'))).map((entry) => entry.artifact);
    return c.json({ total_count: artifacts.length, artifacts });
  });

  app.post('/repos/:owner/:repo/actions/runs/:runId/cancel', (c) => {
    const state = githubState(store);
    const repo = repoFullName(c.req.param('owner'), c.req.param('repo'));
    const entry = state.workflowRuns.find((item) => item.repo === repo && item.run.id === Number(c.req.param('runId')));
    if (!entry) return c.json({ message: 'Not Found' }, 404);
    entry.run.status = 'completed';
    entry.run.conclusion = 'cancelled';
    entry.run.updated_at = now();
    saveState(store, state);
    return new Response(null, { status: 202 });
  });

  app.post('/repos/:owner/:repo/actions/runs/:runId/rerun', (c) => {
    const state = githubState(store);
    const repo = repoFullName(c.req.param('owner'), c.req.param('repo'));
    const original = state.workflowRuns.find((item) => item.repo === repo && item.run.id === Number(c.req.param('runId')));
    if (!original) return c.json({ message: 'Not Found' }, 404);
    const dispatch = { repo, workflowId: original.run.workflow_id, ref: original.run.head_branch, inputs: original.run.inputs ?? {} };
    const run = workflowRunFromDispatch(state, dispatch);
    state.workflowRuns.push({ repo, run });
    state.workflowJobs.push({ repo, job: createWorkflowJob(state, dispatch, run) });
    saveState(store, state);
    return new Response(null, { status: 201 });
  });

  app.post('/repos/:owner/:repo/check-runs', async (c) => {
    const state = githubState(store);
    const repo = repoFullName(c.req.param('owner'), c.req.param('repo'));
    const body = await c.req.json().catch(() => ({}));
    const checkRun = {
      id: state.nextCheckRunId++,
      name: body.name ?? 'emulator-check',
      head_sha: body.head_sha ?? 'github-emulator-main-sha',
      status: body.status ?? 'queued',
      conclusion: body.conclusion ?? null,
      output: body.output ?? null,
      html_url: `https://github.com/${repo}/runs/${state.nextCheckRunId}`,
      started_at: now(),
      completed_at: body.conclusion ? now() : null,
    };
    state.checkRuns.push({ repo, checkRun });
    saveState(store, state);
    return c.json(checkRun, 201);
  });

  app.post('/repos/:owner/:repo/statuses/:sha', async (c) => {
    const state = githubState(store);
    const repo = repoFullName(c.req.param('owner'), c.req.param('repo'));
    const body = await c.req.json().catch(() => ({}));
    const status = {
      id: crypto.randomUUID(),
      sha: c.req.param('sha'),
      state: body.state ?? 'success',
      context: body.context ?? 'default',
      description: body.description ?? '',
      target_url: body.target_url ?? null,
      created_at: now(),
      updated_at: now(),
    };
    state.statuses.push({ repo, status });
    saveState(store, state);
    return c.json(status, 201);
  });

  app.get('/repos/:owner/:repo/commits/:ref/status', (c) => {
    const state = githubState(store);
    const repo = repoFullName(c.req.param('owner'), c.req.param('repo'));
    const statuses = state.statuses.filter((entry) => entry.repo === repo && entry.status.sha === c.req.param('ref')).map((entry) => entry.status);
    return c.json({ state: statuses.at(-1)?.state ?? 'pending', statuses, sha: c.req.param('ref') });
  });

  app.post('/repos/:owner/:repo/hooks', async (c) => {
    const state = githubState(store);
    const repo = repoFullName(c.req.param('owner'), c.req.param('repo'));
    const body = await c.req.json().catch(() => ({}));
    const hook = {
      id: state.nextWebhookId++,
      type: 'Repository',
      name: body.name ?? 'web',
      active: body.active ?? true,
      events: body.events ?? ['push'],
      config: body.config ?? {},
      created_at: now(),
      updated_at: now(),
    };
    state.webhooks.push({ repo, hook });
    saveState(store, state);
    return c.json(hook, 201);
  });

  app.get('/repos/:owner/:repo/hooks', (c) => {
    const state = githubState(store);
    const repo = repoFullName(c.req.param('owner'), c.req.param('repo'));
    return c.json(state.webhooks.filter((entry) => entry.repo === repo).map((entry) => entry.hook));
  });

  app.post('/control/actions/runs/:runId', async (c) => {
    const state = githubState(store);
    const body = await c.req.json().catch(() => ({}));
    const entry = state.workflowRuns.find((item) => item.run.id === Number(c.req.param('runId')));
    if (!entry) return c.json({ message: 'Not Found' }, 404);
    entry.run.status = body.status ?? entry.run.status;
    entry.run.conclusion = body.conclusion ?? entry.run.conclusion;
    entry.run.updated_at = now();
    for (const jobEntry of state.workflowJobs.filter((item) => item.job.run_id === entry.run.id)) {
      jobEntry.job.status = entry.run.status;
      jobEntry.job.conclusion = entry.run.conclusion;
      jobEntry.job.completed_at = entry.run.conclusion ? now() : null;
    }
    saveState(store, state);
    return c.json(entry.run);
  });

  app.post('/control/actions/runs/:runId/artifacts', async (c) => {
    const state = githubState(store);
    const body = await c.req.json().catch(() => ({}));
    const runEntry = state.workflowRuns.find((item) => item.run.id === Number(c.req.param('runId')));
    if (!runEntry) return c.json({ message: 'Not Found' }, 404);
    const artifact = {
      id: state.nextArtifactId++,
      name: body.name ?? 'emulator-artifact',
      size_in_bytes: body.size_in_bytes ?? 0,
      archive_download_url: `https://api.github.com/repos/${runEntry.repo}/actions/artifacts/${state.nextArtifactId}/zip`,
      expired: false,
      created_at: now(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      workflow_run: { id: runEntry.run.id },
    };
    state.artifacts.push({ repo: runEntry.repo, artifact, content: body.content ?? null });
    saveState(store, state);
    return c.json(artifact, 201);
  });

  app.get('/inspect/contract', (c) => c.json(contract));
  app.get('/inspect/repositories', (c) => c.json(githubState(store).repositories));
  app.get('/inspect/issues', (c) => c.json(githubState(store).issues));
  app.get('/inspect/pulls', (c) => c.json(githubState(store).pullRequests));
  app.get('/inspect/workflow-runs', (c) => c.json(githubState(store).workflowRuns));
  app.get('/inspect/workflow-jobs', (c) => c.json(githubState(store).workflowJobs));
  app.get('/inspect/artifacts', (c) => c.json(githubState(store).artifacts));
  app.get('/inspect/check-runs', (c) => c.json(githubState(store).checkRuns));
  app.get('/inspect/statuses', (c) => c.json(githubState(store).statuses));
  app.get('/inspect/webhooks', (c) => c.json(githubState(store).webhooks));
  app.get('/inspect/workflow-dispatches', (c) => c.json(githubState(store).workflowDispatches));
  app.get('/inspect/installation-tokens', (c) => c.json(githubState(store).installationTokens));
  app.post('/inspect/reset', (c) => {
    store.setData?.('github:state', null);
    githubState(store);
    return c.json({ ok: true });
  });

  const fallback = (c) => c.json(genericOpenApiPayload(c));
  app.get('*', fallback);
  app.get('/*', fallback);
  app.post('*', fallback);
  app.post('/*', fallback);
  app.put?.('*', fallback);
  app.put?.('/*', fallback);
  app.patch?.('*', fallback);
  app.patch?.('/*', fallback);
  app.delete?.('*', fallback);
  app.delete?.('/*', fallback);
}

export function seedFromConfig(store, _baseUrl, config) {
  const state = githubState(store);
  for (const user of config.users ?? []) {
    if (user?.login) ensureUser(state, user.login, user);
  }
  for (const spec of config.repositories ?? []) {
    const [owner, repoName] = String(spec.full_name ?? spec.fullName ?? '').split('/');
    if (!owner || !repoName) continue;
    const repo = ensureRepository(state, owner, repoName);
    seedRepository(repo, spec);
    seedStargazers(state, repo, spec.stargazers ?? []);
  }
  saveState(store, state);
}
