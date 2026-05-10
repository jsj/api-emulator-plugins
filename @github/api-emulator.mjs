const DEFAULT_OWNER = 'jsj';
const DEFAULT_REPO = 'vibetrade-monorepo';
const DEFAULT_BRANCH = 'main';

export const contract = {
  provider: 'github',
  source: 'github/rest-api-description OpenAPI',
  docs: 'https://docs.github.com/en/rest',
  scope: ['apps', 'repos', 'git-refs', 'contents', 'issues', 'pulls', 'actions-workflows', 'actions-runs', 'checks'],
  fidelity: 'resource-model-subset',
};

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
    nextIssueNumber: 1,
    nextPullNumber: 1,
    nextRunId: 1000,
    nextJobId: 1500,
    nextArtifactId: 1700,
    nextCheckRunId: 2000,
    nextWebhookId: 3000,
  };
  ensureRepository(initial, DEFAULT_OWNER, DEFAULT_REPO);
  store.setData?.('github:state', initial);
  return initial;
}

function saveState(store, state) {
  store.setData?.('github:state', state);
}

function repoFullName(owner = DEFAULT_OWNER, repo = DEFAULT_REPO) {
  return `${owner}/${repo}`;
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
    state.repositories[fullName] = {
      id: crypto.randomUUID(),
      name: repo,
      full_name: fullName,
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
    };
  }
  return state.repositories[fullName];
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

export const plugin = {
  name: 'github',
  register(app, store) {
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
      if (!content) return c.json({ message: 'Not Found' }, 404);
      return c.json(content);
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
        size: String(body.content ?? '').length,
        encoding: 'base64',
        content: body.content ?? '',
        html_url: `https://github.com/${repo.full_name}/blob/${body.branch ?? repo.default_branch}/${path}`,
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
  },
};

export const label = 'GitHub API emulator';
export const endpoints = 'installation access tokens, repositories, refs, contents, issues, pulls, workflow dispatches/runs, check runs';
export const capabilities = contract.scope;
export const initConfig = {
  github: {
    apiBaseUrl: 'same emulator origin',
  },
};
