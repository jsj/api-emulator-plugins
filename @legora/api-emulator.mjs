const STATE_KEY = 'legora:state';
const NOW = '2026-05-15T12:00:00Z';

function initialState(config = {}) {
  return {
    workspace: { id: 'workspace_emulator', name: 'Emulator Legal Team' },
    matters: [{ id: 'matter_alpha', name: 'Project Alpha Review', client: 'Emulator Corp', status: 'active', created_at: NOW }],
    documents: [
      { id: 'doc_supply', matter_id: 'matter_alpha', name: 'Supply Agreement.pdf', status: 'processed', created_at: NOW },
      { id: 'doc_privacy', matter_id: 'matter_alpha', name: 'Privacy Addendum.docx', status: 'processed', created_at: NOW },
    ],
    workflows: [{ id: 'workflow_review', name: 'Contract Review', status: 'ready', matter_id: 'matter_alpha' }],
    runs: [],
    reviewTables: [{ id: 'table_risks', matter_id: 'matter_alpha', name: 'Risk Register', rows: [{ document_id: 'doc_supply', issue: 'Limitation of liability', risk: 'medium' }] }],
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

function data(rows) {
  return { data: rows, next_cursor: null };
}

function error(c, message, status = 400) {
  return c.json({ error: { message, type: status === 404 ? 'not_found' : 'invalid_request' } }, status);
}

export const contract = {
  provider: 'legora',
  source: 'Legora public product surface-informed workspace subset',
  docs: 'https://legora.com/product',
  baseUrl: 'https://api.legora.com',
  scope: ['workspace', 'matters', 'documents', 'workflows', 'workflow-runs', 'review-tables', 'chat-completions', 'inspection'],
  fidelity: 'stateful-rest-emulator',
  notes: 'No public official API reference was found; routes model the smallest stable legal workspace concepts for local SDK/agent tests.',
};

export const plugin = {
  name: 'legora',
  register(app, store) {
    app.get('/v1/workspace', (c) => c.json(state(store).workspace));
    app.get('/v1/matters', (c) => c.json(data(state(store).matters)));
    app.post('/v1/matters', async (c) => {
      const s = state(store);
      const body = await json(c);
      const matter = { id: `matter_${s.nextId++}`, status: 'active', created_at: new Date().toISOString(), ...body };
      s.matters.push(matter);
      saveState(store, s);
      return c.json(matter, 201);
    });
    app.get('/v1/matters/:matterId/documents', (c) => c.json(data(state(store).documents.filter((document) => document.matter_id === c.req.param('matterId')))));
    app.post('/v1/matters/:matterId/documents', async (c) => {
      const s = state(store);
      const body = await json(c);
      const document = { id: `doc_${s.nextId++}`, matter_id: c.req.param('matterId'), name: body.name ?? 'Uploaded Document.pdf', status: 'processed', created_at: new Date().toISOString() };
      s.documents.push(document);
      saveState(store, s);
      return c.json(document, 201);
    });
    app.get('/v1/workflows', (c) => c.json(data(state(store).workflows)));
    app.post('/v1/workflows/:workflowId/runs', async (c) => {
      const s = state(store);
      const workflow = s.workflows.find((item) => item.id === c.req.param('workflowId'));
      if (!workflow) return error(c, 'Workflow not found', 404);
      const run = { id: `run_${s.nextId++}`, workflow_id: workflow.id, status: 'completed', output: { summary: 'Emulator workflow completed.' }, created_at: new Date().toISOString() };
      s.runs.push(run);
      saveState(store, s);
      return c.json(run, 201);
    });
    app.get('/v1/review-tables/:tableId', (c) => {
      const table = state(store).reviewTables.find((item) => item.id === c.req.param('tableId'));
      return table ? c.json(table) : error(c, 'Review table not found', 404);
    });
    app.post('/v1/chat/completions', async (c) => {
      const body = await json(c);
      return c.json({ id: 'chatcmpl_legora_emulator', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: `Emulator Legora answer for ${body.messages?.at?.(-1)?.content ?? 'legal workspace request'}` }, finish_reason: 'stop' }] });
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Legora API emulator';
export const endpoints = 'Matters, documents, workflows, review tables, and chat completions';
export const capabilities = contract.scope;
export const initConfig = { legora: initialState() };
export default plugin;
