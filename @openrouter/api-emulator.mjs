const IMAGE_BASE64 = Buffer.from('forge-openrouter-emulator-image').toString('base64');
const VIDEO_BYTES = Buffer.from('forge-openrouter-emulator-video');

export const plugin = {
  name: 'openrouter',
  register(app, store) {
    app.post('/v1/chat/completions', async (c) => {
      const body = await c.req.json();
      store.setData('openrouter:last-chat-completion', body);
      const modalities = body.modalities || [];
      if (modalities.includes('video')) {
        return c.json({
          id: 'emu_openrouter_video_123',
          model: body.model,
          choices: [{
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: [{ type: 'video_url', video_url: { url: `${new URL(c.req.url).origin}/assets/video.mp4` } }],
            },
          }],
        });
      }

      return c.json({
        id: 'emu_openrouter_image_123',
        model: body.model,
        choices: [{
          index: 0,
          finish_reason: 'stop',
          message: {
            role: 'assistant',
            content: [{ type: 'image_url', image_url: { url: `data:image/png;base64,${IMAGE_BASE64}` } }],
          },
        }],
      });
    });

    app.get('/assets/video.mp4', () => new Response(VIDEO_BYTES, { headers: { 'Content-Type': 'video/mp4' } }));
    app.get('/inspect/last-chat-completion', (c) => c.json(store.getData('openrouter:last-chat-completion') ?? null));
  },
};

export const label = 'OpenRouter API emulator';
export const endpoints = 'chat/completions';
export const initConfig = { openrouter: {} };
