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
      const userMessage = body.messages?.findLast?.((message) => message.role === 'user')?.content ?? '';
      const prompt = Array.isArray(userMessage)
        ? userMessage.map((part) => part.text ?? '').join('\n')
        : String(userMessage);
      return c.json({
        id: 'msg_emulator_123',
        type: 'message',
        role: 'assistant',
        model: body.model ?? 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: shotListResponse(prompt) }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      });
    });

    app.get('/inspect/last-message', (c) => c.json(store.getData('anthropic:last-message') ?? null));
  },
};

export const label = 'Anthropic API emulator';
export const endpoints = 'messages';
export const initConfig = { anthropic: {} };
