const STATE_KEY = 'harvey:state';
const NOW = '2026-05-15T12:00:00Z';

function initialState(config = {}) {
  return {
    workspace: { id: 'wrk_emulator', name: 'Emulator Legal Workspace' },
    projects: [
      { id: 'prj_contracts', name: 'Commercial Contracts', type: 'vault_project', created_at: NOW },
      { id: 'prj_litigation', name: 'Litigation Research', type: 'vault_project', created_at: NOW },
    ],
    documents: [
      { id: 'doc_msa', project_id: 'prj_contracts', name: 'Master Services Agreement.pdf', mime_type: 'application/pdf', status: 'indexed', created_at: NOW },
      { id: 'doc_memo', project_id: 'prj_litigation', name: 'Case Law Memo.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', status: 'indexed', created_at: NOW },
    ],
    completions: [],
    nextId: 1,
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

function page(data, page = 1, perPage = 50) {
  return { data, page, per_page: perPage, total: data.length, has_more: false };
}

function harveyError(c, message, status = 400) {
  return c.json({ error: { type: status === 404 ? 'not_found' : 'invalid_request_error', message } }, status);
}

async function completion(c, store) {
  const body = await json(c);
  if (!body.query && !body.prompt && !body.messages) return harveyError(c, 'query, prompt, or messages is required');
  const s = state(store);
  const text = body.query ?? body.prompt ?? body.messages?.at?.(-1)?.content ?? 'Summarize the uploaded legal material.';
  const response = {
    id: `cmpl_harvey_${s.nextId++}`,
    object: 'completion',
    model: body.model ?? 'harvey-legal',
    answer: `Emulator legal analysis for: ${text}`,
    citations: s.documents.slice(0, 2).map((document) => ({ document_id: document.id, title: document.name })),
    created_at: new Date().toISOString(),
  };
  s.completions.push(response);
  saveState(store, s);
  return c.json(response);
}

export const contract = {
  provider: 'harvey',
  source: 'Harvey public API guide and API reference-informed subset',
  docs: 'https://developers.harvey.ai/guides/introduction',
  baseUrl: 'https://api.harvey.ai',
  scope: ['vault-workspace-projects', 'vault-documents', 'vault-search', 'completion', 'inspection'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'harvey',
  register(app, store) {
    app.get('/api/v1/vault/workspace/projects', (c) => c.json(page(state(store).projects, Number(c.req.query?.('page') ?? 1), Number(c.req.query?.('per_page') ?? 50))));
    app.get('/api/v1/vault/projects/:projectId/documents', (c) => c.json(page(state(store).documents.filter((document) => document.project_id === c.req.param('projectId')))));
    app.get('/api/v1/vault/documents/:documentId', (c) => {
      const document = state(store).documents.find((item) => item.id === c.req.param('documentId'));
      return document ? c.json(document) : harveyError(c, 'document not found', 404);
    });
    app.post('/api/v1/vault/search', async (c) => {
      const body = await json(c);
      const query = String(body.query ?? '').toLowerCase();
      const rows = state(store).documents.filter((document) => !query || document.name.toLowerCase().includes(query));
      return c.json({ results: rows.map((document) => ({ document, score: 0.98, highlights: [`Matched "${body.query ?? 'legal'}"`] })) });
    });
    app.post('/api/v1/completion', (c) => completion(c, store));
    app.post('/v2/completion', (c) => completion(c, store));
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Harvey API emulator';
export const endpoints = 'Vault projects, documents, search, and legal completion';
export const capabilities = contract.scope;
export const initConfig = { harvey: initialState() };
export default plugin;
