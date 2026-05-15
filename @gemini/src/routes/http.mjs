import { generateContentResponse, modelFromUrl } from '../concepts/generate-content.mjs';

export function registerRoutes(app, store) {
  app.post('/v1beta/*', async (c) => {
    const body = await c.req.json();
    const model = modelFromUrl(c.req.url);
    store.setData('gemini:last-generate-content', { model, body });
    return c.json(generateContentResponse());
  });

  app.get('/inspect/last-generate-content', (c) => c.json(store.getData('gemini:last-generate-content') ?? null));
}
