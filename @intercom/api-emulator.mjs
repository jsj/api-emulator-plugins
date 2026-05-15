const fixedNow = '2026-01-01T00:00:00.000Z';

function initialState(config = {}) {
  return {
    workspace: config.workspace ?? { type: 'workspace', id: 'workspace_emulator', name: 'Emulator Workspace' },
    admins: config.admins ?? [{ type: 'admin', id: 'admin_1', name: 'Emulator Admin', email: 'admin@example.com', away_mode_enabled: false, has_inbox_seat: true }],
    contacts: config.contacts ?? [{
      type: 'contact',
      id: 'contact_1',
      external_id: 'user_ada',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      role: 'user',
      created_at: 1767225600,
      updated_at: 1767225600,
    }],
    conversations: config.conversations ?? [{
      type: 'conversation',
      id: 'conversation_1',
      title: 'Login question',
      state: 'open',
      open: true,
      read: false,
      priority: 'not_priority',
      created_at: 1767225600,
      updated_at: 1767225600,
      contacts: { type: 'contact.list', contacts: [{ id: 'contact_1', type: 'contact' }] },
      admin_assignee_id: null,
      conversation_parts: {
        type: 'conversation_part.list',
        conversation_parts: [{
          type: 'conversation_part',
          id: 'part_1',
          part_type: 'comment',
          body: 'I need help signing in.',
          created_at: 1767225600,
          author: { type: 'contact', id: 'contact_1' },
        }],
      },
    }],
    nextContact: 2,
    nextConversation: 2,
    nextPart: 2,
  };
}

function state(store) {
  const current = store.getData?.('intercom:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('intercom:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('intercom:state', next);
}

function listEnvelope(type, rows, limit = 50) {
  return { type, data: rows.slice(0, limit), pages: { type: 'pages', page: 1, per_page: limit, total_pages: rows.length > limit ? 2 : 1 } };
}

function intercomError(message, code = 'not_found', status = 404) {
  return [{ type: 'error.list', request_id: 'req_emulator', errors: [{ code, message }] }, status];
}

export const contract = {
  provider: 'intercom',
  source: 'Intercom REST API and official Node SDK-informed subset',
  docs: 'https://developers.intercom.com/docs/references/rest-api/api.intercom.io',
  baseUrls: ['https://api.intercom.io', 'https://api.eu.intercom.io', 'https://api.au.intercom.io'],
  scope: ['admins', 'contacts', 'conversations', 'conversation-search', 'conversation-reply'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'intercom',
  register(app, store) {
    app.get('/admins', (c) => c.json(listEnvelope('admin.list', state(store).admins, Number(c.req.query('per_page') ?? 50))));
    app.get('/admins/:id', (c) => {
      const admin = state(store).admins.find((item) => item.id === c.req.param('id'));
      if (!admin) return c.json(...intercomError('Admin not found'));
      return c.json(admin);
    });

    app.get('/contacts', (c) => c.json(listEnvelope('contact.list', state(store).contacts, Number(c.req.query('per_page') ?? 50))));
    app.post('/contacts', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const timestamp = Math.floor(Date.now() / 1000);
      const contact = { type: 'contact', id: `contact_${s.nextContact++}`, role: body.role ?? 'user', created_at: timestamp, updated_at: timestamp, ...body };
      s.contacts.push(contact);
      saveState(store, s);
      return c.json(contact, 201);
    });
    app.get('/contacts/:id', (c) => {
      const contact = state(store).contacts.find((item) => item.id === c.req.param('id') || item.external_id === c.req.param('id'));
      if (!contact) return c.json(...intercomError('Contact not found'));
      return c.json(contact);
    });

    app.get('/conversations', (c) => c.json(listEnvelope('conversation.list', state(store).conversations, Number(c.req.query('per_page') ?? 50))));
    app.post('/conversations/search', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const term = String(body.query?.value ?? body.query ?? '').toLowerCase();
      const rows = state(store).conversations.filter((item) => !term || JSON.stringify(item).toLowerCase().includes(term));
      return c.json(listEnvelope('conversation.list', rows, body.pagination?.per_page ?? 50));
    });
    app.get('/conversations/:id', (c) => {
      const conversation = state(store).conversations.find((item) => item.id === c.req.param('id'));
      if (!conversation) return c.json(...intercomError('Conversation not found'));
      return c.json(conversation);
    });
    app.post('/conversations/:id/reply', async (c) => {
      const s = state(store);
      const conversation = s.conversations.find((item) => item.id === c.req.param('id'));
      if (!conversation) return c.json(...intercomError('Conversation not found'));
      const body = await c.req.json().catch(() => ({}));
      const part = { type: 'conversation_part', id: `part_${s.nextPart++}`, part_type: body.message_type ?? 'comment', body: body.body ?? '', created_at: Math.floor(Date.now() / 1000), author: { type: body.type ?? 'admin', id: body.admin_id ?? body.intercom_user_id ?? 'admin_1' } };
      conversation.conversation_parts.conversation_parts.push(part);
      conversation.updated_at = part.created_at;
      saveState(store, s);
      return c.json(conversation);
    });
    app.post('/conversations/:id/parts', async (c) => {
      const route = app.routes?.find?.((item) => item.method === 'POST' && item.path === '/conversations/:id/reply');
      return route?.handler ? route.handler(c) : c.json(...intercomError('Conversation not found'));
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
    app.get('/inspect/now', (c) => c.json({ now: fixedNow }));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Intercom API emulator';
export const endpoints = 'Admins, contacts, conversation list/search/read, and replies';
export const capabilities = contract.scope;
export const initConfig = { intercom: initialState() };
export default plugin;
