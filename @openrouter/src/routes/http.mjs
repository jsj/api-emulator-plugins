import { chatCompletionResponse, VIDEO_BYTES } from '../concepts/chat.mjs';

export function registerRoutes(app, store) {
  app.post('/v1/chat/completions', async (c) => {
    const body = await c.req.json();
    store.setData('openrouter:last-chat-completion', body);
    return c.json(chatCompletionResponse(body, c.req.url));
  });

  app.get('/assets/video.mp4', () => new Response(VIDEO_BYTES, { headers: { 'Content-Type': 'video/mp4' } }));
  app.get('/inspect/last-chat-completion', (c) => c.json(store.getData('openrouter:last-chat-completion') ?? null));
}
