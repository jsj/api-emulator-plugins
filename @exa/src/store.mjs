export const DEFAULT_RESULTS = [
  {
    id: 'exa_result_agent_api_landscape',
    title: 'Agent API landscape',
    url: 'https://exa.local/results/agent-api-landscape',
    publishedDate: '2026-01-01',
    author: 'Exa Emulator',
    text: 'Deterministic Exa emulator result for web search, RAG, and AI agent tool discovery.',
    highlights: ['web search APIs', 'AI agents', 'RAG'],
    score: 0.97,
  },
  {
    id: 'exa_result_semantic_retrieval',
    title: 'Semantic retrieval patterns',
    url: 'https://exa.local/results/semantic-retrieval',
    publishedDate: '2026-01-02',
    author: 'Exa Emulator',
    text: 'A second canned result useful for semantic search, contents, and similar-link tests.',
    highlights: ['semantic search', 'contents API', 'similarity'],
    score: 0.91,
  },
];

export function state(store) {
  const existing = store.getData?.('exa:state');
  if (existing) return existing;
  const initial = { searches: [], contents: [], similarities: [], answers: [], results: DEFAULT_RESULTS };
  store.setData?.('exa:state', initial);
  return initial;
}

export function saveState(store, value) {
  store.setData?.('exa:state', value);
}
