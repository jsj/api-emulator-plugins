export const DEFAULT_WEB_RESULTS = [
  {
    title: 'Brave Search emulator result',
    url: 'https://brave-search.local/results/agent-web-search',
    description: 'Deterministic Brave Search result for AI agent web-search tests.',
    age: '1 day ago',
    language: 'en',
    family_friendly: true,
  },
  {
    title: 'Agent search API comparison',
    url: 'https://brave-search.local/results/api-comparison',
    description: 'A second canned result for ranking, snippets, and SERP formatting.',
    age: '2 days ago',
    language: 'en',
    family_friendly: true,
  },
];

export const DEFAULT_NEWS_RESULTS = [
  {
    title: 'Agent search APIs gain adoption',
    url: 'https://brave-search.local/news/agent-search-apis',
    description: 'Emulated news result for current-events style workflows.',
    age: '3 hours ago',
    page_age: '2026-05-15T12:00:00Z',
    source: 'Brave Emulator News',
  },
];

export function state(store) {
  const existing = store.getData?.('brave-search:state');
  if (existing) return existing;
  const initial = { searches: [], suggestions: [], webResults: DEFAULT_WEB_RESULTS, newsResults: DEFAULT_NEWS_RESULTS };
  store.setData?.('brave-search:state', initial);
  return initial;
}

export function saveState(store, value) {
  store.setData?.('brave-search:state', value);
}
