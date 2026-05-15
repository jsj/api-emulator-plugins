const UPDATED = '2026-01-20T12:00:00Z';

function initialState(config = {}) {
  return {
    entries: [
      {
        id: 'http://arxiv.org/abs/2401.00001v1',
        title: 'Deterministic API Emulators for Agent Evaluation',
        summary: 'We present a small deterministic emulator surface for validating API clients without production calls.',
        published: '2024-01-01T00:00:00Z',
        updated: '2024-01-02T00:00:00Z',
        authors: ['Ada Lovelace', 'Alan Turing'],
        categories: ['cs.SE', 'cs.AI'],
        primaryCategory: 'cs.SE',
        comment: '12 pages',
        journalRef: 'Emulator Systems 1 (2024)',
        doi: '10.48550/arXiv.2401.00001',
      },
      {
        id: 'http://arxiv.org/abs/2401.00002v1',
        title: 'Local Compatibility Oracles for Scientific Search',
        summary: 'A reproducible search fixture for Atom feed consumers and scientific metadata pipelines.',
        published: '2024-01-03T00:00:00Z',
        updated: '2024-01-04T00:00:00Z',
        authors: ['Grace Hopper'],
        categories: ['cs.DL'],
        primaryCategory: 'cs.DL',
        comment: '8 pages',
        journalRef: null,
        doi: null,
      },
    ],
    queries: [],
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('arxiv:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('arxiv:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('arxiv:state', next);
}

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function textMatch(entry, query) {
  if (!query || query === 'all') return true;
  const normalized = query.replace(/^(all|ti|au|abs|cat):/i, '').replaceAll('+', ' ').toLowerCase();
  const haystack = [entry.title, entry.summary, ...entry.authors, ...entry.categories].join(' ').toLowerCase();
  return haystack.includes(normalized);
}

function entryXml(entry) {
  const links = [
    `<link href="${escapeXml(entry.id)}" rel="alternate" type="text/html"/>`,
    `<link title="pdf" href="${escapeXml(entry.id.replace('/abs/', '/pdf/'))}" rel="related" type="application/pdf"/>`,
  ].join('');
  const authors = entry.authors.map((name) => `<author><name>${escapeXml(name)}</name></author>`).join('');
  const categories = entry.categories.map((term) => `<category term="${escapeXml(term)}" scheme="http://arxiv.org/schemas/atom"/>`).join('');
  const doi = entry.doi ? `<arxiv:doi>${escapeXml(entry.doi)}</arxiv:doi>` : '';
  const journalRef = entry.journalRef ? `<arxiv:journal_ref>${escapeXml(entry.journalRef)}</arxiv:journal_ref>` : '';
  return `<entry><id>${escapeXml(entry.id)}</id><updated>${entry.updated}</updated><published>${entry.published}</published><title>${escapeXml(entry.title)}</title><summary>${escapeXml(entry.summary)}</summary>${authors}<arxiv:comment>${escapeXml(entry.comment)}</arxiv:comment>${journalRef}${doi}<arxiv:primary_category term="${escapeXml(entry.primaryCategory)}" scheme="http://arxiv.org/schemas/atom"/>${categories}${links}</entry>`;
}

function feedXml({ entries, total, start, maxResults, query }) {
  return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom"><link href="http://arxiv.org/api/query?search_query=${escapeXml(query)}&amp;start=${start}&amp;max_results=${maxResults}" rel="self" type="application/atom+xml"/><title>ArXiv Query: ${escapeXml(query)}</title><id>http://arxiv.org/api/query</id><updated>${UPDATED}</updated><opensearch:totalResults>${total}</opensearch:totalResults><opensearch:startIndex>${start}</opensearch:startIndex><opensearch:itemsPerPage>${maxResults}</opensearch:itemsPerPage>${entries.map(entryXml).join('')}</feed>`;
}

function errorFeed(id, summary) {
  return feedXml({
    entries: [{
      id: `https://arxiv.org/api/errors#${id}`,
      title: 'Error',
      summary,
      published: UPDATED,
      updated: UPDATED,
      authors: ['arXiv API'],
      categories: [],
      primaryCategory: 'cs.DL',
      comment: '',
      journalRef: null,
      doi: null,
    }],
    total: 1,
    start: 0,
    maxResults: 1,
    query: 'error',
  });
}

export const contract = {
  provider: 'arxiv',
  source: 'arXiv API Atom feed compatible subset',
  docs: 'https://info.arxiv.org/help/api/user-manual.html',
  baseUrl: 'https://export.arxiv.org/api',
  scope: ['query'],
  fidelity: 'deterministic-atom-feed',
  compatibilityOracle: 'official HTTP API; no official CLI required',
};

export const plugin = {
  name: 'arxiv',
  register(app, store) {
    app.get('/api/query', (c) => {
      const s = state(store);
      const searchQuery = c.req.query('search_query') ?? 'all';
      const idList = (c.req.query('id_list') ?? '').split(',').map((id) => id.trim()).filter(Boolean);
      const startRaw = c.req.query('start') ?? '0';
      const maxRaw = c.req.query('max_results') ?? '10';
      const start = Number(startRaw);
      const maxResults = Number(maxRaw);
      if (!Number.isInteger(start)) return c.text(errorFeed('start_must_be_an_integer', 'start must be an integer'), 400, { 'content-type': 'application/atom+xml' });
      if (!Number.isInteger(maxResults)) return c.text(errorFeed('max_results_must_be_an_integer', 'max_results must be an integer'), 400, { 'content-type': 'application/atom+xml' });
      if (maxResults > 30000) return c.text(errorFeed('max_results_too_large', 'max_results must be less than or equal to 30000'), 400, { 'content-type': 'application/atom+xml' });
      const matched = s.entries.filter((entry) => (idList.length ? idList.some((id) => entry.id.endsWith(id)) : textMatch(entry, searchQuery)));
      s.queries.push({ search_query: searchQuery, id_list: idList, start, max_results: maxResults });
      saveState(store, s);
      return c.text(feedXml({ entries: matched.slice(start, start + maxResults), total: matched.length, start, maxResults, query: searchQuery }), 200, { 'content-type': 'application/atom+xml' });
    });

    app.get('/arxiv/inspect/contract', (c) => c.json(contract));
    app.get('/arxiv/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'arXiv API emulator';
export const endpoints = 'Atom query feed';
export const capabilities = contract.scope;
export const initConfig = { arxiv: initialState() };

export default plugin;
