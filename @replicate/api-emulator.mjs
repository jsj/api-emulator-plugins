const IMAGE_BYTES = Buffer.from('forge-replicate-emulator-image');
const VIDEO_BYTES = Buffer.from('forge-replicate-emulator-video');

function outputUrl(requestUrl, modelName) {
  const origin = new URL(requestUrl).origin;
  return modelName.includes('seedance') || modelName.includes('omni-human')
    ? `${origin}/assets/video.mp4`
    : `${origin}/assets/image.png`;
}

export const plugin = {
  name: 'replicate',
  register(app, store) {
    app.post('/v1/models/:owner/:name/predictions', async (c) => {
      const body = await c.req.json();
      const model = `${c.req.param('owner')}/${c.req.param('name')}`;
      store.setData('replicate:last-prediction', { model, body });
      return c.json({
        id: 'emu_replicate_prediction_123',
        status: 'succeeded',
        output: outputUrl(c.req.url, model),
      }, 201);
    });

    app.get('/v1/predictions/:id', (c) => c.json({
      id: c.req.param('id'),
      status: 'succeeded',
      output: `${new URL(c.req.url).origin}/assets/image.png`,
    }));

    app.get('/assets/image.png', () => new Response(IMAGE_BYTES, { headers: { 'Content-Type': 'image/png' } }));
    app.get('/assets/video.mp4', () => new Response(VIDEO_BYTES, { headers: { 'Content-Type': 'video/mp4' } }));
    app.get('/inspect/last-prediction', (c) => c.json(store.getData('replicate:last-prediction') ?? null));
  },
};

export const label = 'Replicate API emulator';
export const endpoints = 'models/:owner/:name/predictions, predictions/:id';
export const initConfig = { replicate: {} };
