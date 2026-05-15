import { IMAGE_BYTES, predictionResponse, VIDEO_BYTES } from '../concepts/predictions.mjs';

export function registerRoutes(app, store) {
  app.post('/v1/models/:owner/:name/predictions', async (c) => {
    const body = await c.req.json();
    const model = `${c.req.param('owner')}/${c.req.param('name')}`;
    store.setData('replicate:last-prediction', { model, body });
    return c.json(predictionResponse(c.req.url, model), 201);
  });

  app.get('/v1/predictions/:id', (c) => c.json({
    id: c.req.param('id'),
    status: 'succeeded',
    output: `${new URL(c.req.url).origin}/assets/image.png`,
  }));

  app.get('/assets/image.png', () => new Response(IMAGE_BYTES, { headers: { 'Content-Type': 'image/png' } }));
  app.get('/assets/video.mp4', () => new Response(VIDEO_BYTES, { headers: { 'Content-Type': 'video/mp4' } }));
  app.get('/inspect/last-prediction', (c) => c.json(store.getData('replicate:last-prediction') ?? null));
}
