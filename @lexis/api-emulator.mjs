const STATE_KEY = 'lexis:state';
const NOW = '2026-05-15T12:00:00Z';

function initialState(config = {}) {
  return {
    user: { id: 'usr_lexis', displayName: 'Ada Lovelace', email: 'ada@example.com' },
    sources: [
      { id: 'cases', name: 'US Cases', type: 'case_law' },
      { id: 'law_reviews', name: 'Law Reviews and Journals', type: 'secondary' },
    ],
    documents: [
      {
        id: 'doc_roe',
        title: 'Example Holdings v. Emulator Corp.',
        source: 'cases',
        citation: '123 F.4th 456',
        court: '9th Cir.',
        date: '2026-01-15',
        snippet: 'A contract interpretation dispute suitable for local API emulator tests.',
      },
      {
        id: 'doc_article',
        title: 'Modern Contract Drafting for AI Workflows',
        source: 'law_reviews',
        citation: '42 Emul. L. Rev. 1',
        date: '2026-02-01',
        snippet: 'A secondary-source article about contract review.',
      },
    ],
    folders: [{ id: 'folder_research', name: 'Contract Research', created_at: NOW, document_ids: ['doc_roe'] }],
    nextFolder: 2,
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

async function json(c) {
  return c.req.json().catch(() => ({}));
}

function searchRows(s, query, source) {
  const q = String(query ?? '').toLowerCase();
  return s.documents.filter((document) =>
    (!source || document.source === source) &&
    (!q || `${document.title} ${document.citation} ${document.snippet}`.toLowerCase().includes(q)),
  );
}

function searchResponse(rows) {
  return { results: rows, totalResults: rows.length, nextPageToken: null };
}

function error(c, message, status = 400) {
  return c.json({ error: { code: status === 404 ? 'not_found' : 'bad_request', message } }, status);
}

export const contract = {
  provider: 'lexis',
  source: 'LexisNexis Web Services API public guide-informed legal research subset',
  docs: 'https://www.lexisnexis.com/en-us/products/lexis-api.page',
  baseUrl: 'https://services-api.lexisnexis.com',
  scope: ['identity', 'sources', 'search', 'documents', 'folders', 'inspection'],
  fidelity: 'stateful-rest-emulator',
  notes: 'Public docs describe gated Lexis APIs; this emulator keeps a small legal research slice with WSAPI-compatible aliases.',
};

export const plugin = {
  name: 'lexis',
  register(app, store) {
    app.get('/v1/me', (c) => c.json(state(store).user));
    app.get('/v1/sources', (c) => c.json({ sources: state(store).sources }));
    app.post('/v1/search', async (c) => {
      const body = await json(c);
      return c.json(searchResponse(searchRows(state(store), body.query, body.source)));
    });
    app.get('/v1/documents/:documentId', (c) => {
      const document = state(store).documents.find((item) => item.id === c.req.param('documentId'));
      return document ? c.json(document) : error(c, 'Document not found', 404);
    });
    app.get('/v1/folders', (c) => c.json({ folders: state(store).folders }));
    app.post('/v1/folders', async (c) => {
      const s = state(store);
      const body = await json(c);
      const folder = { id: `folder_${s.nextFolder++}`, name: body.name ?? 'Emulator Research', created_at: new Date().toISOString(), document_ids: body.document_ids ?? [] };
      s.folders.push(folder);
      saveState(store, s);
      return c.json(folder, 201);
    });

    app.get('/wsapi/rest/sources', (c) => c.json({ Sources: state(store).sources }));
    app.post('/wsapi/rest/search', async (c) => {
      const body = await json(c);
      return c.json(searchResponse(searchRows(state(store), body.query ?? body.SearchTerm, body.source ?? body.Source)));
    });
    app.get('/wsapi/rest/documents/:documentId', (c) => {
      const document = state(store).documents.find((item) => item.id === c.req.param('documentId'));
      return document ? c.json({ Document: document }) : error(c, 'Document not found', 404);
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Lexis API emulator';
export const endpoints = 'Identity, sources, legal search, documents, folders, and WSAPI aliases';
export const capabilities = contract.scope;
export const initConfig = { lexis: initialState() };
export default plugin;
