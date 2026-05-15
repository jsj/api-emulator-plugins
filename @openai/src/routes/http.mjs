import { chatCompletion } from '../concepts/chat.mjs';
import { editSummary, imageGenerationResponse } from '../concepts/images.mjs';

export function registerRoutes(app, store) {
  app.post('/v1/images/generations', async (c) => {
    const body = await c.req.json();
    store.setData('openai:last-generation', body);
    return c.json(imageGenerationResponse('emu_openai_generation_123'));
  });

  app.post('/v1/images/edits', async (c) => {
    const body = await c.req.parseBody();
    store.setData('openai:last-edit', editSummary(body));
    return c.json(imageGenerationResponse('emu_openai_edit_123'));
  });

  app.post('/v1/chat/completions', async (c) => {
    const body = await c.req.json();
    store.setData('openai:last-chat-completion', body);
    return c.json(chatCompletion(store, body));
  });

  app.get('/inspect/last-generation', (c) => c.json(store.getData('openai:last-generation') ?? null));
  app.get('/inspect/last-edit', (c) => c.json(store.getData('openai:last-edit') ?? null));
  app.get('/inspect/last-chat-completion', (c) => c.json(store.getData('openai:last-chat-completion') ?? null));
}
