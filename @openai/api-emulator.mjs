const IMAGE_TEXT = 'forge-openai-emulator-image';
const IMAGE_BASE64 = Buffer.from(IMAGE_TEXT).toString('base64');
const INTERACTIONS_KEY = 'api-emulator:interactions';

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => [key, normalize(val)]));
}

function requestKey(value) {
  return JSON.stringify(normalize(value));
}

function interactions(store) {
  return store.getData(INTERACTIONS_KEY) ?? [];
}

function findRecordedResponse(store, endpoint, request) {
  const key = requestKey(request);
  return interactions(store)
    .slice()
    .reverse()
    .find((entry) => entry.service === 'openai' && entry.method === 'POST' && entry.endpoint === endpoint && requestKey(entry.request) === key)?.response;
}

function recordInteraction(store, endpoint, request, response) {
  store.setData(INTERACTIONS_KEY, [
    ...interactions(store),
    {
      service: 'openai',
      method: 'POST',
      endpoint,
      request: normalize(request),
      response,
      status: 200,
      recordedAt: new Date().toISOString(),
    },
  ]);
}

export const plugin = {
  name: 'openai',
  register(app, store) {
    app.post('/v1/images/generations', async (c) => {
      const body = await c.req.json();
      store.setData('openai:last-generation', body);
      return c.json({ id: 'emu_openai_generation_123', data: [{ b64_json: IMAGE_BASE64 }] });
    });

    app.post('/v1/images/edits', async (c) => {
      const body = await c.req.parseBody();
      store.setData('openai:last-edit', {
        model: body.model,
        prompt: body.prompt,
        size: body.size,
        quality: body.quality,
        output_format: body.output_format,
        output_compression: body.output_compression,
        background: body.background,
        moderation: body.moderation,
        hasImage: Boolean(body.image),
      });
      return c.json({ id: 'emu_openai_edit_123', data: [{ b64_json: IMAGE_BASE64 }] });
    });

    app.post('/v1/chat/completions', async (c) => {
      const body = await c.req.json();
      store.setData('openai:last-chat-completion', body);
      const recorded = findRecordedResponse(store, '/v1/chat/completions', body);
      if (recorded) return c.json(recorded);
      const userMessage = body.messages?.findLast?.((message) => message.role === 'user')?.content ?? '';
      const response = {
        id: 'emu_openai_chat_123',
        choices: [{ message: { role: 'assistant', content: `forge-openai-emulator-text: ${userMessage}` } }],
      };
      recordInteraction(store, '/v1/chat/completions', body, response);
      return c.json(response);
    });

    app.get('/inspect/last-generation', (c) => c.json(store.getData('openai:last-generation') ?? null));
    app.get('/inspect/last-edit', (c) => c.json(store.getData('openai:last-edit') ?? null));
    app.get('/inspect/last-chat-completion', (c) => c.json(store.getData('openai:last-chat-completion') ?? null));
  },
};

export const label = 'OpenAI API emulator';
export const endpoints = 'images/generations, images/edits, chat/completions';
export const initConfig = { openai: {} };
