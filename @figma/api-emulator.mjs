import { fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'figma:state';

function defaultState(baseUrl = 'https://api.figma.com') {
  return {
    baseUrl,
    me: { id: 'user:emulator', email: 'emulator@example.test', handle: 'Figma Emulator' },
    files: {
      'emulator-file': {
        name: 'Emulator Design System',
        lastModified: fixedNow,
        thumbnailUrl: `${baseUrl}/v1/images/emulator-file?ids=1:1`,
        version: '1',
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [{ id: '1:1', name: 'Landing Page', type: 'CANVAS', children: [] }],
        },
        components: {},
        styles: {},
        schemaVersion: 0,
        role: 'owner',
        editorType: 'figma',
        linkAccess: 'view',
      },
    },
    comments: [],
  };
}

function state(store) {
  return getState(store, STATE_KEY, () => defaultState());
}

export function seedFromConfig(store, baseUrl = 'https://api.figma.com', config = {}) {
  const seeded = defaultState(baseUrl);
  if (config.files) seeded.files = { ...seeded.files, ...config.files };
  if (config.me) seeded.me = { ...seeded.me, ...config.me };
  return setState(store, STATE_KEY, seeded);
}

export const contract = {
  provider: 'figma',
  source: 'Figma REST API OpenAPI subset',
  docs: 'https://developers.figma.com/docs/rest-api/',
  baseUrl: 'https://api.figma.com',
  scope: ['me', 'files', 'images', 'comments'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'figma',
  register(app, store) {
    app.get('/v1/me', (c) => c.json(state(store).me));
    app.get('/v1/files/:key', (c) => {
      const file = state(store).files[c.req.param('key')];
      if (!file) return routeError(c, 'File not found', 404, 'not_found');
      return c.json(file);
    });
    app.get('/v1/images/:key', (c) => {
      const ids = (c.req.query('ids') ?? '1:1').split(',');
      const file = state(store).files[c.req.param('key')];
      if (!file) return routeError(c, 'File not found', 404, 'not_found');
      return c.json({ err: null, images: Object.fromEntries(ids.map((id) => [id, `${state(store).baseUrl}/mock/figma/${c.req.param('key')}/${encodeURIComponent(id)}.png`])) });
    });
    app.get('/v1/files/:key/comments', (c) => {
      const comments = state(store).comments.filter((comment) => comment.file_key === c.req.param('key'));
      return c.json({ comments });
    });
    app.post('/v1/files/:key/comments', async (c) => {
      const current = state(store);
      if (!current.files[c.req.param('key')]) return routeError(c, 'File not found', 404, 'not_found');
      const body = await readBody(c);
      const comment = {
        id: `comment:${current.comments.length + 1}`,
        file_key: c.req.param('key'),
        message: body.message ?? '',
        created_at: fixedNow,
        resolved_at: null,
        user: current.me,
      };
      current.comments.push(comment);
      return c.json(comment, 201);
    });
    app.get('/figma/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Figma API emulator';
export const endpoints = 'me, files, images, comments';
export const initConfig = { figma: { apiToken: 'figd_emulator_token', fileKey: 'emulator-file' } };

export default plugin;
