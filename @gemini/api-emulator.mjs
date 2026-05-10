const IMAGE_BASE64 = Buffer.from('forge-gemini-emulator-image').toString('base64');

export const plugin = {
  name: 'gemini',
  register(app, store) {
    app.post('/v1beta/*', async (c) => {
      const body = await c.req.json();
      const model = new URL(c.req.url).pathname
        .replace('/v1beta/models/', '')
        .replace(':generateContent', '');
      store.setData('gemini:last-generate-content', { model, body });
      return c.json({
        candidates: [{
          content: {
            parts: [{ inlineData: { data: IMAGE_BASE64, mimeType: 'image/png' } }],
          },
        }],
      });
    });

    app.get('/inspect/last-generate-content', (c) => c.json(store.getData('gemini:last-generate-content') ?? null));
  },
};

export const label = 'Gemini API emulator';
export const endpoints = 'models/:model:generateContent';
export const initConfig = { gemini: {} };
