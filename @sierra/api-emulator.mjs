function initialState(config = {}) {
  return {
    contractStatus: 'mobile-sdk-public',
    reason: config.reason ?? 'Sierra public REST docs are login-gated, but public Sierra mobile SDKs expose embed and voice transport URL shapes.',
    agents: config.agents ?? [{
      token: 'agent_emulator',
      name: 'Sierra Emulator Agent',
      target: 'production',
      greeting: 'How can I help you today?',
    }],
    conversations: config.conversations ?? [{
      id: 'conversation_1',
      token: 'agent_emulator',
      state: 'open',
      messages: [{ role: 'agent', text: 'How can I help you today?', created_at: '2026-01-01T00:00:00.000Z' }],
    }],
  };
}

function state(store) {
  const current = store.getData?.('sierra:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('sierra:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('sierra:state', next);
}

export const contract = {
  provider: 'sierra',
  source: 'Sierra public iOS, Android, and React Native SDK-informed mobile embed subset',
  docs: 'https://github.com/sierra-inc/sierra-react-native-sdk',
  baseUrls: ['https://sierra.chat', 'https://eu.sierra.chat', 'https://sg.sierra.chat', 'https://api.sierra.chat'],
  scope: ['mobile-agent-embed', 'conversation-fixtures', 'voice-svp-probe'],
  fidelity: 'stateful-sdk-emulator',
  notes: 'Public REST docs remain login-gated; this covers the public SDK contract: /agent/{token}/mobile and /chat/voice/svp/{token}.',
};

export const plugin = {
  name: 'sierra',
  register(app, store) {
    app.get('/agent/:token/mobile', (c) => {
      const s = state(store);
      const token = c.req.param('token');
      const agent = s.agents.find((item) => item.token === token) ?? { token, name: 'Sierra Agent', greeting: 'How can I help you today?' };
      if (!s.agents.some((item) => item.token === token)) {
        s.agents.push(agent);
        s.conversations.push({ id: `conversation_${s.conversations.length + 1}`, token, state: 'open', messages: [{ role: 'agent', text: agent.greeting, created_at: new Date().toISOString() }] });
        saveState(store, s);
      }
      const body = `<!doctype html><html><head><meta charset="utf-8"><title>${agent.name}</title></head><body><main id="sierra-agent" data-token="${token}" data-target="${c.req.query('target') ?? ''}"><h1>${agent.name}</h1><p>${agent.greeting}</p></main><script>window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:"agentMessageEnd",conversationState:"conversation_1"}));</script></body></html>`;
      return c.html ? c.html(body) : c.body(body, 200, { 'content-type': 'text/html; charset=utf-8' });
    });

    app.get('/chat/voice/svp/:token', (c) => {
      const token = c.req.param('token');
      return c.json({ error: 'upgrade_required', message: 'SVP voice uses a WebSocket transport at this path.', token }, 426);
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
    app.get('/sierra/inspect/contract', (c) => c.json(contract));
    app.get('/sierra/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Sierra API emulator';
export const endpoints = 'Mobile agent embed, voice SVP probe, and inspectable conversation fixtures';
export const capabilities = contract.scope;
export const initConfig = { sierra: initialState() };
export default plugin;
