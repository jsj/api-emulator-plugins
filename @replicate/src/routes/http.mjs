import { IMAGE_BYTES, predictionResponse, VIDEO_BYTES } from '../concepts/predictions.mjs';

function modelResponse(requestUrl, owner, name) {
  const origin = new URL(requestUrl).origin;
  return {
    url: `${origin}/v1/models/${owner}/${name}`,
    owner,
    name,
    description: 'Replicate emulator model',
    visibility: 'public',
    github_url: '',
    paper_url: '',
    license_url: '',
    run_count: 123,
    cover_image_url: `${origin}/assets/image.png`,
    latest_version: {
      id: 'emu_replicate_version_123',
      created_at: new Date().toISOString(),
      cog_version: '0.0.1',
      openapi_schema: {
        openapi: '3.0.0',
        components: {
          schemas: {
            Input: {
              type: 'object',
              properties: {
                prompt: { type: 'string', description: 'Prompt text' },
              },
            },
            Output: {
              type: 'string',
              format: 'uri',
            },
          },
        },
      },
    },
  };
}

export function registerRoutes(app, store) {
  app.get('/v1/models/:owner/:name', (c) => c.json(modelResponse(c.req.url, c.req.param('owner'), c.req.param('name'))));

  app.get('/v1/models/:owner/:name/versions/:version', (c) => c.json({
    ...modelResponse(c.req.url, c.req.param('owner'), c.req.param('name')).latest_version,
    id: c.req.param('version'),
  }));

  app.post('/v1/models/:owner/:name/predictions', async (c) => {
    const body = await c.req.json();
    const model = `${c.req.param('owner')}/${c.req.param('name')}`;
    const prediction = { ...predictionResponse(c.req.url, model), input: body.input ?? {} };
    store.setData('replicate:last-prediction', { model, body, prediction });
    return c.json(prediction, 201);
  });

  app.post('/v1/predictions', async (c) => {
    const body = await c.req.json();
    const prediction = { ...predictionResponse(c.req.url, 'replicate/hello-world'), version: body.version ?? 'emu_replicate_version_123', input: body.input ?? {} };
    store.setData('replicate:last-prediction', { model: prediction.model, body, prediction });
    return c.json(prediction, 201);
  });

  app.get('/v1/predictions/:id', (c) => c.json(store.getData('replicate:last-prediction')?.prediction ?? predictionResponse(c.req.url, 'replicate/hello-world')));

  app.get('/assets/image.png', () => new Response(IMAGE_BYTES, { headers: { 'Content-Type': 'image/png' } }));
  app.get('/assets/video.mp4', () => new Response(VIDEO_BYTES, { headers: { 'Content-Type': 'video/mp4' } }));
  app.get('/inspect/last-prediction', (c) => c.json(store.getData('replicate:last-prediction') ?? null));
}
