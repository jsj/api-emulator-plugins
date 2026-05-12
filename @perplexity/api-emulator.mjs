const DEFAULT_RESULTS = [
  {
    title: 'Perplexity emulator research briefing',
    url: 'https://perplexity.local/results/research-briefing',
    snippet: 'Deterministic emulator result for research, news, and product discovery queries.',
    date: '2026-01-01',
  },
  {
    title: 'Perplexity emulator source summary',
    url: 'https://perplexity.local/results/source-summary',
    snippet: 'A second canned result suitable for search result ranking and formatting tests.',
    date: '2026-01-02',
  },
];

export const contract = {
  provider: 'perplexity',
  source: 'Perplexity API compatible search subset',
  docs: 'https://docs.perplexity.ai',
  scope: ['search'],
  fidelity: 'deterministic-subset',
};

function state(store) {
  const existing = store.getData?.('perplexity:state');
  if (existing) return existing;
  const initial = { searches: [], results: DEFAULT_RESULTS };
  store.setData?.('perplexity:state', initial);
  return initial;
}

function saveState(store, value) {
  store.setData?.('perplexity:state', value);
}

function resultForQuery(query, result, index) {
  return {
    ...result,
    title: `${result.title}: ${query}`,
    snippet: `${result.snippet} Query: ${query}.`,
    rank: index + 1,
  };
}

export const plugin = {
  name: 'perplexity',
  register(app, store) {
    app.post('/search', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const query = String(body.query ?? '').trim();
      const maxResults = Math.max(0, Number(body.max_results ?? body.maxResults ?? 10));
      const current = state(store);
      const search = {
        query,
        maxResults,
        requestedAt: new Date().toISOString(),
      };
      current.searches.push(search);
      saveState(store, current);
      const results = current.results.slice(0, maxResults).map((result, index) => resultForQuery(query || 'empty query', result, index));
      return c.json({ results });
    });

    app.get('/inspect/searches', (c) => c.json(state(store).searches));
    app.get('/inspect/results', (c) => c.json(state(store).results));
  },
};

export const label = 'Perplexity API emulator';
export const endpoints = 'search';
export const initConfig = {
  perplexity: {
    apiKey: 'perplexity-emulator-key',
  },
};
