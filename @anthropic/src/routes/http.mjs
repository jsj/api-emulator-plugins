import { messageResponse } from '../concepts/messages.mjs';

export function registerRoutes(app, store) {
  app.post('/v1/messages', async (c) => {
    const body = await c.req.json();
    store.setData('anthropic:last-message', body);
    return c.json(messageResponse(store, body));
  });

  app.get('/inspect/last-message', (c) => c.json(store.getData('anthropic:last-message') ?? null));
}
