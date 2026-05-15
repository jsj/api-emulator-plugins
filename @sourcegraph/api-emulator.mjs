const STATE_KEY = 'sourcegraph:state';
const NOW = '2026-05-15T12:00:00.000Z';

function initialState(config = {}) {
  return {
    baseUrl: config.baseUrl ?? 'https://sourcegraph.com',
    currentUser: config.currentUser ?? { id: 'VXNlcjox', username: 'emulator', displayName: 'Sourcegraph Emulator', siteAdmin: true },
    repositories: config.repositories ?? [
      { id: 'UmVwb3NpdG9yeTox', name: 'github.com/sourcegraph/emulator', stars: 42, url: '/github.com/sourcegraph/emulator' },
    ],
    models: config.models ?? [
      { id: 'anthropic::2024-10-22::claude-3-5-sonnet-latest', displayName: 'Claude 3.5 Sonnet', provider: 'anthropic', capabilities: ['chat', 'autocomplete'] },
      { id: 'openai::2024-08-06::gpt-4o', displayName: 'GPT-4o', provider: 'openai', capabilities: ['chat'] },
    ],
    searches: [],
    contextRequests: [],
    ...config,
  };
}

export function seedFromConfig(store, baseUrl, config = {}) {
  const next = initialState({ baseUrl, ...config });
  store.setData?.(STATE_KEY, next);
  return next;
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

function graphqlSearch(s, query) {
  const result = {
    repositories: s.repositories.map((repository) => ({ repository, lineMatches: [{ preview: `Emulator match for ${query || 'sourcegraph'}`, lineNumber: 1 }] })),
    results: s.repositories.map((repository) => ({ __typename: 'FileMatch', repository, file: { path: 'README.md', url: `${repository.url}/-/blob/README.md` }, lineMatches: [{ preview: `Emulator match for ${query || 'sourcegraph'}`, lineNumber: 1 }] })),
    matchCount: s.repositories.length,
    timedout: false,
    cloning: [],
    missing: [],
    alert: null,
    elapsedMilliseconds: 5,
  };
  return result;
}

export const contract = {
  provider: 'sourcegraph',
  source: 'Sourcegraph official GraphQL, Stream API, CLI, and OpenAPI documentation',
  docs: 'https://sourcegraph.com/docs/api',
  baseUrl: 'https://sourcegraph.com',
  auth: ['Authorization: token <token>', 'Authorization: Bearer <token>'],
  scope: ['graphql-current-user', 'graphql-search', 'stream-search', 'cody-context', 'llm-models', 'inspection'],
  compatibilityOracle: 'Sourcegraph src CLI supports SRC_ENDPOINT and SRC_ACCESS_TOKEN.',
  fidelity: 'stateful-rest-and-graphql-emulator',
};

export const plugin = {
  name: 'sourcegraph',
  register(app, store) {
    app.post('/.api/graphql', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const query = String(body.query ?? '');
      const variables = body.variables ?? {};
      const data = {};
      if (query.includes('currentUser')) data.currentUser = s.currentUser;
      if (query.includes('search')) {
        const searchQuery = variables.query ?? variables.pattern ?? body.queryText ?? 'repo:github.com/sourcegraph/emulator';
        s.searches.push({ query: searchQuery, createdAt: NOW, source: 'graphql' });
        data.search = graphqlSearch(s, searchQuery);
        saveState(store, s);
      }
      return c.json({ data });
    });

    app.get('/.api/search/stream', (c) => {
      const s = state(store);
      const query = c.req.query('q') ?? '';
      s.searches.push({ query, createdAt: NOW, source: 'stream' });
      saveState(store, s);
      const events = [
        { type: 'matches', data: [{ type: 'content', repository: s.repositories[0].name, path: 'README.md', lineMatches: [{ preview: `Emulator match for ${query}`, lineNumber: 1 }] }] },
        { type: 'progress', data: { matchCount: s.repositories.length, durationMs: 5, skipped: [] } },
        { type: 'done', data: {} },
      ];
      const payload = events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n`).join('\n');
      return c.text?.(payload, 200, { 'content-type': 'text/event-stream' }) ?? c.json({ events });
    });

    app.get('/.api/llm/models', (c) => c.json({ data: state(store).models }));
    app.get('/.api/llm/models/:modelId', (c) => {
      const model = state(store).models.find((item) => item.id === c.req.param('modelId'));
      if (!model) return c.json({ error: { message: 'model not found' } }, 404);
      return c.json(model);
    });
    app.post('/.api/cody/context', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const query = body.query ?? body.messages?.at?.(-1)?.text ?? 'sourcegraph emulator';
      const request = { query, createdAt: NOW };
      s.contextRequests.push(request);
      saveState(store, s);
      return c.json({ results: [{ uri: 'git://github.com/sourcegraph/emulator?README.md', content: `Context for ${query}`, range: { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } }, repository: s.repositories[0].name }] });
    });
    app.get('/sourcegraph/inspect/state', (c) => c.json(state(store)));
  },
};
