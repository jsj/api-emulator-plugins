function initialState(config = {}) {
  return {
    users: config.users ?? [{ id: 'user_ada', email: 'ada@example.com', name: 'Ada Lovelace' }],
    flows: config.flows ?? [{ id: 'flow_support', name: 'Support Follow-up', status: 'active' }],
    outboundMessages: config.outboundMessages ?? [],
    nextMessage: 1,
  };
}

function state(store) {
  const current = store.getData?.('decagon:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('decagon:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('decagon:state', next);
}

function error(message, code = 'bad_request') {
  return { error: { code, message } };
}

export const contract = {
  provider: 'decagon',
  source: 'Decagon public API reference snippets-informed outbound chat subset',
  docs: 'https://docs.decagon.ai/api-reference/getting-started',
  baseUrl: 'https://api.decagon.ai',
  scope: ['outbound-chat', 'support-flow-fixtures'],
  fidelity: 'stateful-rest-emulator',
  notes: 'Detailed docs are access-restricted; this plugin intentionally covers only public outbound chat shape.',
};

export const plugin = {
  name: 'decagon',
  register(app, store) {
    app.post('/chat/outbound', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      if (!body.text || !body.user_id || !body.flow_id) return c.json(error('text, user_id, and flow_id are required'), 400);
      const message = {
        id: `outbound_${s.nextMessage++}`,
        object: 'outbound_chat_message',
        status: 'queued',
        text: body.text,
        user_id: body.user_id,
        flow_id: body.flow_id,
        metadata: body.metadata ?? {},
        created_at: new Date().toISOString(),
      };
      if (!s.users.some((user) => user.id === body.user_id)) s.users.push({ id: body.user_id, metadata: body.user_metadata ?? {} });
      s.outboundMessages.push(message);
      saveState(store, s);
      return c.json(message, 202);
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Decagon API emulator';
export const endpoints = 'Outbound chat message creation and inspectable support-flow fixtures';
export const capabilities = contract.scope;
export const initConfig = { decagon: initialState() };
export default plugin;
