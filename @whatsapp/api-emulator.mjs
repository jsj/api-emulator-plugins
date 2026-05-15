const STATE_KEY = 'whatsapp:state';

function now() {
  return new Date().toISOString();
}

function initialState(config = {}) {
  return {
    businessAccountId: config.businessAccountId ?? 'whatsapp_business_seed',
    phoneNumbers: config.phoneNumbers ?? [{
      id: '15550001111',
      display_phone_number: '+1 555-000-1111',
      verified_name: 'WhatsApp Emulator',
      quality_rating: 'GREEN',
      code_verification_status: 'VERIFIED',
    }],
    messages: config.messages ?? [{
      id: 'wamid.seed',
      messaging_product: 'whatsapp',
      to: '15551234567',
      type: 'text',
      text: { body: 'Seed WhatsApp message' },
      status: 'sent',
      created_at: '2026-01-01T00:00:00.000Z',
    }],
    media: config.media ?? [{
      id: 'media_seed',
      messaging_product: 'whatsapp',
      mime_type: 'image/png',
      sha256: 'emulator-sha256',
      url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments/media_seed',
    }],
    templates: config.templates ?? [{
      id: 'template_seed',
      name: 'hello_world',
      language: 'en_US',
      status: 'APPROVED',
      category: 'UTILITY',
      components: [{ type: 'BODY', text: 'Hello world' }],
    }],
    nextMessage: 1,
    nextMedia: 1,
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

function messagePayload(s, phoneNumberId, input) {
  const to = input.to ?? input.recipient?.id ?? '15551234567';
  const type = input.type ?? (input.text ? 'text' : 'template');
  return {
    id: `wamid.emulator.${s.nextMessage++}`,
    messaging_product: input.messaging_product ?? 'whatsapp',
    phone_number_id: phoneNumberId,
    to,
    type,
    text: input.text,
    template: input.template,
    interactive: input.interactive,
    status: 'sent',
    created_at: now(),
  };
}

export const contract = {
  provider: 'whatsapp',
  source: 'Meta WhatsApp Cloud API and official WhatsApp Node.js SDK-informed surface',
  docs: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
  scope: ['phone-numbers', 'messages', 'media', 'templates', 'webhook-verification', 'state-inspection'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'whatsapp',
  register(app, store) {
    app.get('/webhook', (c) => {
      const mode = c.req.query?.('hub.mode');
      const token = c.req.query?.('hub.verify_token');
      const challenge = c.req.query?.('hub.challenge');
      if (mode === 'subscribe' && token) return c.text?.(challenge ?? '') ?? c.json({ challenge });
      return c.json({ error: { message: 'Verification failed', code: 403 } }, 403);
    });

    app.get('/:version/:businessAccountId/phone_numbers', (c) => {
      const s = state(store);
      return c.json(page(s.phoneNumbers, c));
    });

    app.get('/:version/:businessAccountId/message_templates', (c) => {
      const s = state(store);
      return c.json(page(s.templates, c));
    });

    app.post('/:version/:phoneNumberId/messages', async (c) => {
      const s = state(store);
      const input = await body(c);
      const message = messagePayload(s, c.req.param('phoneNumberId'), input);
      s.messages.push(message);
      saveState(store, s);
      return c.json({
        messaging_product: 'whatsapp',
        contacts: [{ input: message.to, wa_id: message.to.replace(/^\+/, '') }],
        messages: [{ id: message.id, message_status: 'accepted' }],
      });
    });

    app.get('/:version/:phoneNumberId/messages', (c) => {
      const rows = state(store).messages.filter((message) => message.phone_number_id === c.req.param('phoneNumberId') || !message.phone_number_id);
      return c.json(page(rows, c));
    });

    app.post('/:version/:phoneNumberId/media', async (c) => {
      const s = state(store);
      const input = await body(c);
      const media = {
        id: `media_${s.nextMedia++}`,
        messaging_product: 'whatsapp',
        phone_number_id: c.req.param('phoneNumberId'),
        mime_type: input.type ?? input.mime_type ?? 'application/octet-stream',
        url: input.url ?? `https://lookaside.fbsbx.com/whatsapp_business/attachments/media_${s.nextMedia}`,
        created_at: now(),
      };
      s.media.push(media);
      saveState(store, s);
      return c.json({ id: media.id });
    });

    app.get('/:version/:mediaId', (c) => {
      const media = state(store).media.find((item) => item.id === c.req.param('mediaId'));
      if (!media) return c.json({ error: { message: 'Media not found', code: 100 } }, 404);
      return c.json(media);
    });

    app.delete('/:version/:mediaId', (c) => {
      const s = state(store);
      const before = s.media.length;
      s.media = s.media.filter((item) => item.id !== c.req.param('mediaId'));
      saveState(store, s);
      return c.json({ success: s.media.length !== before });
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'WhatsApp Cloud API emulator';
export const endpoints = 'phone numbers, messages, media, message templates, webhooks, and state inspection';
export const capabilities = contract.scope;
export const initConfig = { whatsapp: initialState() };
export default plugin;
