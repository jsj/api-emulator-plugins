export const DEFAULT_RESULTS = [
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

export function state(store) {
  const existing = store.getData?.('perplexity:state');
  if (existing) return existing;
  const initial = { searches: [], results: DEFAULT_RESULTS };
  store.setData?.('perplexity:state', initial);
  return initial;
}

export function saveState(store, value) {
  store.setData?.('perplexity:state', value);
}
