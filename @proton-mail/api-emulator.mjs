import { fixedNow, getState, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'proton-mail:state';

function defaultState() {
  return {
    labels: [{ ID: '0', Name: 'Inbox', Type: 1, Path: 'Inbox', Color: '#6d4aff' }, { ID: 'label_emulator', Name: 'Emulator', Type: 3, Path: 'Emulator', Color: '#19a974' }],
    messages: [{ ID: 'message_emulator', ConversationID: 'conversation_emulator', Subject: 'Welcome to the Proton Mail emulator', Sender: { Name: 'Ada', Address: 'ada@example.com' }, ToList: [{ Name: 'Local User', Address: 'local@example.com' }], Time: 1767225600, Size: 1024, NumAttachments: 0, Unread: 1, LabelIDs: ['0'], AddressID: 'address_emulator', Body: 'Deterministic Proton Mail message body.' }],
    nextLabel: 2,
  };
}

const state = (store) => getState(store, STATE_KEY, defaultState);
const save = (store, next) => setState(store, STATE_KEY, next);
const protonError = (c, status, message, code = 1000) => c.json({ Code: code, Error: message, Details: {} }, status);

export const contract = {
  provider: 'proton-mail',
  source: 'Official Proton go-proton-api client and development server behavior',
  docs: 'https://github.com/ProtonMail/go-proton-api',
  baseUrl: 'https://mail.proton.me/api',
  auth: 'Bearer token with x-pm-appversion and x-pm-uid headers',
  scope: ['labels', 'messages', 'read-state'],
  fidelity: 'stateful-mail-rest-emulator',
};

export const plugin = {
  name: 'proton-mail',
  register(app, store) {
    app.get('/core/v4/labels', (c) => c.json({ Code: 1000, Labels: state(store).labels }));
    app.post('/core/v4/labels', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const label = { ID: `label_${s.nextLabel++}`, Name: body.Name ?? body.name ?? 'Created Label', Type: body.Type ?? 3, Path: body.Path ?? body.Name ?? 'Created Label', Color: body.Color ?? '#6d4aff' };
      s.labels.push(label);
      save(store, s);
      return c.json({ Code: 1000, Label: label }, 201);
    });
    app.get('/mail/v4/messages', (c) => {
      const page = Number(c.req.query('Page') ?? 0);
      const pageSize = Number(c.req.query('PageSize') ?? 100);
      const messages = state(store).messages.slice(page * pageSize, page * pageSize + pageSize);
      return c.json({ Code: 1000, Messages: messages.map(({ Body, ...message }) => message), Total: state(store).messages.length, Stale: 0 });
    });
    app.get('/mail/v4/messages/:messageId', (c) => {
      const message = state(store).messages.find((item) => item.ID === c.req.param('messageId'));
      if (!message) return protonError(c, 404, 'Message not found', 15052);
      return c.json({ Code: 1000, Message: message });
    });
    app.put('/mail/v4/messages/read', async (c) => markMessages(c, store, 0));
    app.put('/mail/v4/messages/unread', async (c) => markMessages(c, store, 1));
    app.get('/proton-mail/inspect/state', (c) => c.json(state(store)));
  },
};

async function markMessages(c, store, unread) {
  const s = state(store);
  const body = await c.req.json().catch(() => ({}));
  const ids = body.IDs ?? body.ids ?? [];
  for (const message of s.messages) {
    if (ids.includes(message.ID)) message.Unread = unread;
  }
  save(store, s);
  return c.json({ Code: 1000, Responses: ids.map((ID) => ({ ID, Response: { Code: 1000 } })) });
}

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, { ...defaultState(), ...config });
}

export const label = 'Proton Mail API emulator';
export const endpoints = 'labels, message list, message details, and read-state updates';
export const capabilities = contract.scope;
export const initConfig = { 'proton-mail': { appVersion: 'go-proton-api' } };
export default plugin;
