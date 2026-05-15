const STATE_KEY = 'greptile:state';
const NOW = '2026-05-15T12:00:00.000Z';

function initialState(config = {}) {
  return {
    repositories: config.repositories ?? [
      { id: 'repo_emulator', remote: 'github', repository: 'factory-ai/api-emulator-registry', branch: 'main', status: 'indexed', createdAt: NOW, updatedAt: NOW },
    ],
    queries: [],
    searches: [],
    nextRepo: 1,
    ...config,
  };
}

function state(store) {
  const current = store.getData?.(STATE_KEY);
  if (current) return current;
  const next = initialState();
  store.setData?.(STATE_KEY, next);
  return next;
}

function saveState(store, next) {
  store.setData?.(STATE_KEY, next);
}

async function jsonBody(c) {
  return c.req.json().catch(() => ({}));
}

function normalizeRepo(body = {}, s) {
  const remote = body.remote ?? body.provider ?? 'github';
  const repository = body.repository ?? body.repo ?? body.github_repo ?? 'factory-ai/api-emulator-registry';
  const branch = body.branch ?? body.ref ?? 'main';
  return s.repositories.find((repo) => repo.remote === remote && repo.repository === repository && repo.branch === branch);
}

export const contract = {
  provider: 'greptile',
  source: 'Greptile official REST and MCP documentation',
  docs: 'https://www.greptile.com/docs/api-reference/introduction',
  baseUrl: 'https://api.greptile.com/v2',
  auth: ['Authorization: Bearer <GREPTILE_API_KEY>', 'X-GitHub-Token: <token> for GitHub repository access'],
  scope: ['repository-indexing', 'query', 'search', 'inspection'],
  compatibilityOracle: 'Greptile exposes official MCP and REST APIs; no standalone CLI with safe base URL override found.',
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'greptile',
  register(app, store) {
    app.post('/v2/repositories', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      let repo = normalizeRepo(body, s);
      if (!repo) {
        repo = {
          id: `repo_${String(s.nextRepo++).padStart(6, '0')}`,
          remote: body.remote ?? body.provider ?? 'github',
          repository: body.repository ?? body.repo ?? 'factory-ai/api-emulator-registry',
          branch: body.branch ?? body.ref ?? 'main',
          status: 'indexed',
          createdAt: NOW,
          updatedAt: NOW,
        };
        s.repositories.push(repo);
      }
      saveState(store, s);
      return c.json(repo, 202);
    });

    app.get('/v2/repositories/:repositoryId', (c) => {
      const repo = state(store).repositories.find((item) => item.id === c.req.param('repositoryId'));
      if (!repo) return c.json({ error: { message: 'repository not found' } }, 404);
      return c.json(repo);
    });

    app.post('/v2/query', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const repo = normalizeRepo(body, s) ?? s.repositories[0];
      const message = body.message ?? body.query ?? body.messages?.at?.(-1)?.content ?? 'How does this repository work?';
      const result = {
        id: `qry_${s.queries.length + 1}`,
        message,
        answer: `Emulator answer for ${repo.repository}: ${message}`,
        repositories: [repo],
        sources: [{ repository: repo.repository, remote: repo.remote, branch: repo.branch, filepath: 'README.md', line_start: 1, line_end: 12 }],
        createdAt: NOW,
      };
      s.queries.push(result);
      saveState(store, s);
      return c.json(result);
    });

    app.post('/v2/search', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const repo = normalizeRepo(body, s) ?? s.repositories[0];
      const query = body.query ?? body.message ?? 'emulator';
      const result = {
        query,
        results: [{ repository: repo.repository, remote: repo.remote, branch: repo.branch, filepath: 'README.md', content: `Search result for ${query}`, score: 0.92, line_start: 1, line_end: 4 }],
      };
      s.searches.push({ ...result, createdAt: NOW });
      saveState(store, s);
      return c.json(result);
    });

    app.get('/greptile/inspect/state', (c) => c.json(state(store)));
  },
};
