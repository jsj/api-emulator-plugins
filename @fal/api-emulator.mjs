const VIDEO_BYTES = Buffer.from('forge-fal-emulator-video');

export const plugin = {
  name: 'fal',
  register(app, store) {
    app.post('/bytedance/seedance-2.0/fast/text-to-video', async (c) => {
      const body = await c.req.json();
      store.setData('fal:last-submit', body);
      return c.json({
        status: 'IN_QUEUE',
        request_id: 'emu_fal_request_123',
      });
    });

    app.get('/bytedance/seedance-2.0/fast/text-to-video/requests/:request_id/status', (c) => c.json({
      status: 'COMPLETED',
      request_id: c.req.param('request_id'),
    }));

    app.get('/bytedance/seedance-2.0/fast/text-to-video/requests/:request_id', (c) => c.json({
      seed: 42,
      video: { url: `${new URL(c.req.url).origin}/assets/video.mp4` },
    }));

    app.get('/assets/video.mp4', () => new Response(VIDEO_BYTES, { headers: { 'Content-Type': 'video/mp4' } }));
    app.get('/inspect/last-submit', (c) => c.json(store.getData('fal:last-submit') ?? null));
  },
};

export const label = 'fal API emulator';
export const endpoints = 'Seedance 2 queue text-to-video';
export const initConfig = { fal: {} };
