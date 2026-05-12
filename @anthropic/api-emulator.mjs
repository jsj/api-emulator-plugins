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
    .find((entry) => entry.service === 'anthropic' && entry.method === 'POST' && entry.endpoint === endpoint && requestKey(entry.request) === key)?.response;
}

function recordInteraction(store, endpoint, request, response) {
  store.setData(INTERACTIONS_KEY, [
    ...interactions(store),
    {
      service: 'anthropic',
      method: 'POST',
      endpoint,
      request: normalize(request),
      response,
      status: 200,
      recordedAt: new Date().toISOString(),
    },
  ]);
}

function shotListResponse(prompt) {
  let sceneId = 'scene-01';
  try {
    const parsed = JSON.parse(prompt);
    sceneId = parsed.scenes?.[0]?.id ?? sceneId;
  } catch {
    // Keep the default scene id for non-JSON prompts.
  }

  return JSON.stringify({
    scenes: [{
      id: sceneId,
      shots: [{
        id: `${sceneId}-shot-emulator-01`,
        durationSeconds: 12,
        camera: 'wide hallway angle with a slow push toward the fridge',
        action: 'Roco enters the old apartment, stops at the fridge, and notices the Polaroid.',
        references: ['apartment', 'hallway', 'fridge', 'polaroid'],
      }],
    }],
  });
}

export const plugin = {
  name: 'anthropic',
  register(app, store) {
    app.post('/v1/messages', async (c) => {
      const body = await c.req.json();
      store.setData('anthropic:last-message', body);
      const recorded = findRecordedResponse(store, '/v1/messages', body);
      if (recorded) return c.json(recorded);
      const userMessage = body.messages?.findLast?.((message) => message.role === 'user')?.content ?? '';
      const prompt = Array.isArray(userMessage)
        ? userMessage.map((part) => part.text ?? '').join('\n')
        : String(userMessage);
      const response = {
        id: 'msg_emulator_123',
        type: 'message',
        role: 'assistant',
        model: body.model ?? 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: shotListResponse(prompt) }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      };
      recordInteraction(store, '/v1/messages', body, response);
      return c.json(response);
    });

    app.get('/inspect/last-message', (c) => c.json(store.getData('anthropic:last-message') ?? null));
  },
};

export const label = 'Anthropic API emulator';
export const endpoints = 'messages';
export const initConfig = { anthropic: {} };
