const STATE_KEY = 'facebook-messenger:state';

function now() {
  return new Date().toISOString();
}

function initialState(config = {}) {
  return {
    pages: config.pages ?? [{
      id: 'page_123',
      name: 'Messenger Emulator Page',
      access_token: 'page_token_emulator',
      category: 'Business',
      tasks: ['MESSAGING'],
    }],
    conversations: config.conversations ?? [{
      id: 'conv_seed',
      page_id: 'page_123',
      participants: {
        data: [
          { id: 'page_123', name: 'Messenger Emulator Page' },
          { id: 'psid_123', name: 'Ada Lovelace' },
        ],
      },
      updated_time: '2026-01-01T00:00:00.000Z',
    }],
    messages: config.messages ?? [{
      id: 'mid.seed',
      conversation_id: 'conv_seed',
      page_id: 'page_123',
      recipient: { id: 'psid_123' },
      message: { text: 'Seed Messenger message' },
      created_time: '2026-01-01T00:00:00.000Z',
    }],
    profiles: config.profiles ?? [{
      id: 'psid_123',
      first_name: 'Ada',
      last_name: 'Lovelace',
      name: 'Ada Lovelace',
      profile_pic: 'https://example.test/ada.png',
    }],
    nextConversation: 1,
    nextMessage: 1,
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

async function body(c) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

function page(items, c, key = 'data') {
  const limit = Number(c.req.query?.('limit') ?? 100);
  return { [key]: items.slice(0, limit) };
}

function conversationFor(s, pageId, psid) {
  let conversation = s.conversations.find((item) => item.page_id === pageId && item.participants.data.some((participant) => participant.id === psid));
  if (conversation) return conversation;
  conversation = {
    id: `conv_${s.nextConversation++}`,
    page_id: pageId,
    participants: { data: [{ id: pageId }, { id: psid }] },
    updated_time: now(),
  };
  s.conversations.push(conversation);
  return conversation;
}

function normalizeMessageInput(input) {
  const recipient = input.recipient ?? { id: input.recipient_id ?? 'psid_123' };
  const message = input.message ?? (input.text ? { text: input.text } : { text: 'Hello from Messenger emulator' });
  return { recipient, message, messaging_type: input.messaging_type ?? 'RESPONSE', tag: input.tag };
}

export const contract = {
  provider: 'facebook-messenger',
  source: 'Meta Messenger Platform Send API and Facebook Graph SDK-informed surface',
  docs: 'https://developers.facebook.com/docs/messenger-platform',
  scope: ['pages', 'conversations', 'messages', 'profiles', 'webhook-verification', 'state-inspection'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'facebook-messenger',
  register(app, store) {
    app.get('/webhook', (c) => {
      const mode = c.req.query?.('hub.mode');
      const token = c.req.query?.('hub.verify_token');
      const challenge = c.req.query?.('hub.challenge');
      if (mode === 'subscribe' && token) return c.text?.(challenge ?? '') ?? c.json({ challenge });
      return c.json({ error: { message: 'Verification failed', code: 403 } }, 403);
    });

    app.get('/:version/me/accounts', (c) => c.json(page(state(store).pages, c)));

    app.get('/:version/:pageId/conversations', (c) => {
      const conversations = state(store).conversations.filter((item) => item.page_id === c.req.param('pageId'));
      return c.json(page(conversations, c));
    });

    app.get('/:version/:conversationId/messages', (c) => {
      const messages = state(store).messages.filter((item) => item.conversation_id === c.req.param('conversationId'));
      return c.json(page(messages, c));
    });

    const send = async (c) => {
      const s = state(store);
      const pageId = c.req.param('pageId') ?? s.pages[0]?.id ?? 'page_123';
      const input = normalizeMessageInput(await body(c));
      const conversation = conversationFor(s, pageId, input.recipient.id);
      conversation.updated_time = now();
      const message = {
        id: `mid.emulator.${s.nextMessage++}`,
        conversation_id: conversation.id,
        page_id: pageId,
        recipient: input.recipient,
        message: input.message,
        messaging_type: input.messaging_type,
        tag: input.tag,
        created_time: now(),
      };
      s.messages.push(message);
      saveState(store, s);
      return c.json({ recipient_id: input.recipient.id, message_id: message.id });
    };

    app.post('/:version/:pageId/messages', send);
    app.post('/:version/me/messages', send);

    app.get('/:version/:profileId', (c) => {
      const s = state(store);
      const id = c.req.param('profileId');
      const profile = s.profiles.find((item) => item.id === id) ?? s.pages.find((item) => item.id === id);
      if (!profile) return c.json({ error: { message: 'Unsupported get request', code: 100 } }, 404);
      return c.json(profile);
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Facebook Messenger Platform emulator';
export const endpoints = 'pages, conversations, Send API messages, profiles, webhooks, and state inspection';
export const capabilities = contract.scope;
export const initConfig = { facebookMessenger: initialState() };
export default plugin;
