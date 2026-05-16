const STATE_KEY = 'imsg:state';

const APPLE_EPOCH_OFFSET_SECONDS = 978_307_200;

function now() {
  return new Date().toISOString();
}

function appleEpoch(date) {
  return Math.trunc((Date.parse(date) / 1000 - APPLE_EPOCH_OFFSET_SECONDS) * 1_000_000_000);
}

function initialState(config = {}) {
  return {
    account: config.account ?? {
      id: 'iMessage;+;me@icloud.com',
      login: 'me@icloud.com',
      lastAddressedHandle: 'me@icloud.com',
    },
    handles: config.handles ?? [
      { id: 1, address: '+15551234567' },
      { id: 2, address: '+15557654321' },
    ],
    chats: config.chats ?? [
      {
        id: 1,
        chatIdentifier: 'iMessage;+;chat-emulator',
        guid: 'iMessage;+;chat-emulator',
        displayName: 'Emulator Group',
        serviceName: 'iMessage',
        participants: [1, 2],
      },
      {
        id: 2,
        chatIdentifier: '+15551234567',
        guid: 'iMessage;-;+15551234567',
        displayName: 'Ada Direct',
        serviceName: 'iMessage',
        participants: [1],
      },
    ],
    messages: config.messages ?? [
      {
        id: 1,
        chatId: 1,
        handleId: 1,
        text: 'hello from emulator',
        guid: 'imsg-emulator-message-1',
        date: '2026-01-01T00:00:00.000Z',
        isFromMe: false,
        service: 'iMessage',
      },
      {
        id: 2,
        chatId: 1,
        handleId: 0,
        text: 'reply from local account',
        guid: 'imsg-emulator-message-2',
        date: '2026-01-01T00:01:00.000Z',
        isFromMe: true,
        service: 'iMessage',
      },
      {
        id: 3,
        chatId: 2,
        handleId: 1,
        text: 'direct hello',
        guid: 'imsg-emulator-message-3',
        date: '2026-01-01T00:02:00.000Z',
        isFromMe: false,
        service: 'iMessage',
      },
    ],
    attachments: config.attachments ?? [
      {
        id: 1,
        messageId: 1,
        filename: '/tmp/imsg-emulator/photo.jpg',
        transferName: 'photo.jpg',
        uti: 'public.jpeg',
        mimeType: 'image/jpeg',
        totalBytes: 128,
        isSticker: false,
      },
    ],
    reactions: config.reactions ?? [],
    nextMessage: config.nextMessage ?? 4,
    nextReaction: config.nextReaction ?? 1,
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

function sqlString(value) {
  return `'${String(value ?? '').replaceAll("'", "''")}'`;
}

function sqlInteger(value) {
  return Number.isFinite(Number(value)) ? String(Number(value)) : '0';
}

async function body(c) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

function handleFor(s, id) {
  return s.handles.find((handle) => Number(handle.id) === Number(id));
}

function chatFor(s, id) {
  return s.chats.find((chat) => Number(chat.id) === Number(id));
}

function chatByTarget(s, target) {
  if (!target) return undefined;
  const text = String(target);
  return s.chats.find((chat) => (
    String(chat.id) === text
    || chat.chatIdentifier === text
    || chat.guid === text
    || chat.displayName === text
    || chat.participants?.some((handleId) => handleFor(s, handleId)?.address === text)
  ));
}

function messageChat(s, message) {
  return chatFor(s, message.chatId);
}

function attachmentsFor(s, messageId) {
  return s.attachments
    .filter((attachment) => Number(attachment.messageId) === Number(messageId))
    .map((attachment) => ({
      filename: attachment.filename,
      transfer_name: attachment.transferName,
      uti: attachment.uti,
      mime_type: attachment.mimeType,
      total_bytes: attachment.totalBytes,
      is_sticker: Boolean(attachment.isSticker),
      original_path: attachment.filename,
      missing: false,
    }));
}

function reactionsFor(s, messageGuid) {
  return s.reactions
    .filter((reaction) => reaction.reactedToGuid === messageGuid)
    .map((reaction) => ({
      id: reaction.id,
      type: reaction.type,
      emoji: reaction.emoji,
      sender: reaction.sender,
      is_from_me: Boolean(reaction.isFromMe),
      created_at: reaction.date,
    }));
}

function chatPayload(s, chat) {
  const participants = (chat.participants ?? [])
    .map((handleId) => handleFor(s, handleId)?.address)
    .filter(Boolean);
  const lastMessage = [...s.messages]
    .filter((message) => Number(message.chatId) === Number(chat.id))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
  return {
    id: chat.id,
    identifier: chat.chatIdentifier,
    guid: chat.guid,
    name: chat.displayName,
    display_name: chat.displayName,
    contact_name: chat.displayName,
    service: chat.serviceName,
    last_message_at: lastMessage?.date ?? null,
    participants,
    is_group: participants.length > 1 || String(chat.guid).includes(';+;'),
    account_id: s.account.id,
    account_login: s.account.login,
    last_addressed_handle: s.account.lastAddressedHandle,
  };
}

function messagePayload(s, message, { includeAttachments = false, includeReactions = false } = {}) {
  const chat = messageChat(s, message);
  const sender = message.isFromMe ? s.account.login : handleFor(s, message.handleId)?.address;
  const payload = {
    id: message.id,
    chat_id: message.chatId,
    chat_identifier: chat?.chatIdentifier ?? '',
    chat_guid: chat?.guid ?? '',
    chat_name: chat?.displayName ?? '',
    participants: (chat?.participants ?? []).map((handleId) => handleFor(s, handleId)?.address).filter(Boolean),
    is_group: (chat?.participants?.length ?? 0) > 1 || String(chat?.guid ?? '').includes(';+;'),
    guid: message.guid,
    sender,
    sender_name: message.isFromMe ? 'Me' : sender,
    is_from_me: Boolean(message.isFromMe),
    text: message.text,
    created_at: message.date,
    service: message.service,
  };
  if (includeAttachments) payload.attachments = attachmentsFor(s, message.id);
  if (includeReactions) payload.reactions = reactionsFor(s, message.guid);
  return payload;
}

function limitFrom(c, fallback = 50) {
  const raw = Number(c.req.query?.('limit') ?? fallback);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

function parseBoolean(value) {
  return value === true || value === 'true' || value === '1';
}

function page(items, c) {
  return items.slice(0, limitFrom(c));
}

function createMessage(s, input = {}) {
  const chat = chatByTarget(s, input.chat_id ?? input.chatId ?? input.chat_identifier ?? input.chatIdentifier ?? input.chat_guid ?? input.chatGuid ?? input.to)
    ?? s.chats[0];
  const message = {
    id: s.nextMessage++,
    chatId: chat.id,
    handleId: 0,
    text: input.text ?? '',
    guid: `imsg-emulator-message-${Date.now()}-${s.nextMessage}`,
    date: now(),
    isFromMe: true,
    service: input.service === 'sms' ? 'SMS' : 'iMessage',
  };
  s.messages.push(message);
  return message;
}

function reactionEmoji(type) {
  return {
    love: '❤️',
    like: '👍',
    dislike: '👎',
    laugh: '😂',
    emphasis: '‼️',
    question: '❓',
  }[type] ?? type;
}

function fixtureSql(s) {
  const lines = [
    'PRAGMA foreign_keys=OFF;',
    'BEGIN TRANSACTION;',
    'CREATE TABLE message (ROWID INTEGER PRIMARY KEY, handle_id INTEGER, text TEXT, guid TEXT, associated_message_guid TEXT, associated_message_type INTEGER, date INTEGER, is_from_me INTEGER, service TEXT);',
    'CREATE TABLE chat (ROWID INTEGER PRIMARY KEY, chat_identifier TEXT, guid TEXT, display_name TEXT, service_name TEXT, account_id TEXT, account_login TEXT, last_addressed_handle TEXT, reserved TEXT);',
    'CREATE TABLE handle (ROWID INTEGER PRIMARY KEY, id TEXT);',
    'CREATE TABLE chat_handle_join (chat_id INTEGER, handle_id INTEGER);',
    'CREATE TABLE chat_message_join (chat_id INTEGER, message_id INTEGER, message_date INTEGER);',
    'CREATE TABLE attachment (ROWID INTEGER PRIMARY KEY, filename TEXT, transfer_name TEXT, uti TEXT, mime_type TEXT, total_bytes INTEGER, is_sticker INTEGER);',
    'CREATE TABLE message_attachment_join (message_id INTEGER, attachment_id INTEGER);',
  ];

  for (const handle of s.handles) {
    lines.push(`INSERT INTO handle(ROWID, id) VALUES (${sqlInteger(handle.id)}, ${sqlString(handle.address)});`);
  }

  for (const chat of s.chats) {
    lines.push(
      `INSERT INTO chat(ROWID, chat_identifier, guid, display_name, service_name, account_id, account_login, last_addressed_handle, reserved) VALUES (${sqlInteger(chat.id)}, ${sqlString(chat.chatIdentifier)}, ${sqlString(chat.guid)}, ${sqlString(chat.displayName)}, ${sqlString(chat.serviceName)}, ${sqlString(s.account.id)}, ${sqlString(s.account.login)}, ${sqlString(s.account.lastAddressedHandle)}, NULL);`,
    );
    for (const handleId of chat.participants ?? []) {
      lines.push(`INSERT INTO chat_handle_join(chat_id, handle_id) VALUES (${sqlInteger(chat.id)}, ${sqlInteger(handleId)});`);
    }
  }

  for (const message of s.messages) {
    const date = typeof message.date === 'number' ? message.date : appleEpoch(message.date);
    lines.push(
      `INSERT INTO message(ROWID, handle_id, text, guid, associated_message_guid, associated_message_type, date, is_from_me, service) VALUES (${sqlInteger(message.id)}, ${sqlInteger(message.handleId)}, ${sqlString(message.text)}, ${sqlString(message.guid)}, NULL, NULL, ${sqlInteger(date)}, ${message.isFromMe ? 1 : 0}, ${sqlString(message.service)});`,
    );
    lines.push(`INSERT INTO chat_message_join(chat_id, message_id, message_date) VALUES (${sqlInteger(message.chatId)}, ${sqlInteger(message.id)}, ${sqlInteger(date)});`);
  }

  for (const attachment of s.attachments) {
    lines.push(
      `INSERT INTO attachment(ROWID, filename, transfer_name, uti, mime_type, total_bytes, is_sticker) VALUES (${sqlInteger(attachment.id)}, ${sqlString(attachment.filename)}, ${sqlString(attachment.transferName)}, ${sqlString(attachment.uti)}, ${sqlString(attachment.mimeType)}, ${sqlInteger(attachment.totalBytes)}, ${attachment.isSticker ? 1 : 0});`,
    );
    lines.push(`INSERT INTO message_attachment_join(message_id, attachment_id) VALUES (${sqlInteger(attachment.messageId)}, ${sqlInteger(attachment.id)});`);
  }

  lines.push('COMMIT;');
  return `${lines.join('\n')}\n`;
}

export const contract = {
  provider: 'imsg',
  source: 'macOS Messages chat.db schema fixture and imsg CLI JSON surface',
  docs: 'https://github.com/zmirror/imsg',
  scope: [
    'messages-sqlite-fixture',
    'chats',
    'history',
    'search',
    'send',
    'tapbacks',
    'json-rpc',
    'attachments',
    'state-inspection',
  ],
  fidelity: 'stateful-rest-and-json-rpc-emulator',
};

export const plugin = {
  name: 'imsg',
  register(app, store) {
    app.get('/imsg/inspect/contract', (c) => c.json(contract));
    app.get('/imsg/inspect/state', (c) => c.json(state(store)));
    app.get('/imsg/fixtures/chat-db.sql', (c) => c.text(fixtureSql(state(store))));

    app.get('/imsg/status', (c) => c.json({
      ok: true,
      bridge_ready: true,
      rpc_methods: [
        'chats.list',
        'messages.history',
        'messages.search',
        'watch.subscribe',
        'watch.unsubscribe',
        'send',
        'react',
      ],
      account: state(store).account,
    }));

    app.get('/imsg/account', (c) => c.json(state(store).account));

    app.get('/imsg/chats', (c) => {
      const s = state(store);
      return c.json(page(s.chats.map((chat) => chatPayload(s, chat)), c));
    });

    app.get('/imsg/chats/:chatId/history', (c) => {
      const s = state(store);
      const includeAttachments = parseBoolean(c.req.query?.('attachments'));
      const includeReactions = parseBoolean(c.req.query?.('reactions'));
      const chatId = Number(c.req.param('chatId'));
      const messages = s.messages
        .filter((message) => Number(message.chatId) === chatId)
        .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
        .map((message) => messagePayload(s, message, { includeAttachments, includeReactions }));
      return c.json(page(messages, c));
    });

    app.get('/imsg/search', (c) => {
      const s = state(store);
      const query = String(c.req.query?.('query') ?? '').toLowerCase();
      const match = c.req.query?.('match') ?? 'contains';
      const messages = s.messages
        .filter((message) => {
          const text = String(message.text ?? '').toLowerCase();
          return match === 'exact' ? text === query : text.includes(query);
        })
        .map((message) => messagePayload(s, message, { includeAttachments: true, includeReactions: true }));
      return c.json(page(messages, c));
    });

    app.post('/imsg/send', async (c) => {
      const s = state(store);
      const message = createMessage(s, await body(c));
      saveState(store, s);
      return c.json({ ok: true, message: messagePayload(s, message, { includeAttachments: true, includeReactions: true }) });
    });

    app.post('/imsg/react', async (c) => {
      const s = state(store);
      const input = await body(c);
      const chat = chatByTarget(s, input.chat_id ?? input.chatId) ?? s.chats[0];
      const target = [...s.messages].reverse().find((message) => (
        message.guid === input.guid
        || Number(message.id) === Number(input.message_id ?? input.messageId)
        || Number(message.chatId) === Number(chat.id)
      ));
      if (!target) return c.json({ error: { message: 'message not found' } }, 404);
      const type = input.reaction ?? input.type ?? 'like';
      const reaction = {
        id: s.nextReaction++,
        reactedToGuid: target.guid,
        type,
        emoji: reactionEmoji(type),
        sender: s.account.login,
        isFromMe: true,
        date: now(),
      };
      s.reactions.push(reaction);
      saveState(store, s);
      return c.json({ ok: true, reaction });
    });

    app.post('/imsg/rpc', async (c) => {
      const s = state(store);
      const request = await body(c);
      const params = request.params ?? {};
      const id = request.id ?? null;
      const response = (result) => c.json({ jsonrpc: '2.0', id, result });
      const error = (code, message) => c.json({ jsonrpc: '2.0', id, error: { code, message } });

      switch (request.method) {
        case 'chats.list':
          return response(s.chats.map((chat) => chatPayload(s, chat)));
        case 'messages.history': {
          const chatId = Number(params.chat_id ?? params.chatId);
          return response(s.messages
            .filter((message) => Number(message.chatId) === chatId)
            .map((message) => messagePayload(s, message, {
              includeAttachments: Boolean(params.attachments),
              includeReactions: Boolean(params.reactions),
            })));
        }
        case 'messages.search': {
          const query = String(params.query ?? '').toLowerCase();
          return response(s.messages
            .filter((message) => String(message.text ?? '').toLowerCase().includes(query))
            .map((message) => messagePayload(s, message, { includeAttachments: true, includeReactions: true })));
        }
        case 'send': {
          const message = createMessage(s, params);
          saveState(store, s);
          return response(messagePayload(s, message, { includeAttachments: true, includeReactions: true }));
        }
        case 'react':
          return error(-32601, 'react is available over REST at POST /imsg/react');
        default:
          return error(-32601, `method not found: ${request.method}`);
      }
    });
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config.imsg ?? config));
}

export const label = 'imsg Messages API and database fixture emulator';
export const endpoints = 'chats, history, search, send, tapbacks, JSON-RPC, deterministic chat.db SQL fixture, and inspector';
export const capabilities = contract.scope;
export const initConfig = { imsg: initialState() };
export default plugin;
