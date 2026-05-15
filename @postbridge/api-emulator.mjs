import { createToken, fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'postbridge:state';

function initialState(config = {}) {
  return {
    user: { id: 'user_emulator', email: 'creator@example.com', name: 'Emulator Creator' },
    accounts: [
      { id: 'acc_instagram', platform: 'instagram', username: 'emulator_ig', status: 'connected', capabilities: ['image', 'video', 'carousel'] },
      { id: 'acc_tiktok', platform: 'tiktok', username: 'emulator_tt', status: 'connected', capabilities: ['video', 'draft'] },
    ],
    media: [{ id: 'media_emulator_1', url: 'https://cdn.post-bridge.test/media/1.jpg', type: 'image', status: 'ready', created_at: fixedNow }],
    posts: [{
      id: 'post_emulator_1',
      caption: 'Hello from Post Bridge emulator',
      platforms: ['instagram'],
      account_ids: ['acc_instagram'],
      status: 'scheduled',
      scheduled_at: '2026-01-02T12:00:00.000Z',
      created_at: fixedNow,
    }],
    analytics: [{ post_id: 'post_emulator_1', impressions: 1200, likes: 81, comments: 5, shares: 3 }],
    nextPost: 2,
    nextMedia: 2,
    ...config,
  };
}

const state = (store) => getState(store, STATE_KEY, () => initialState());
const save = (store, next) => setState(store, STATE_KEY, next);
const error = (c, message, status = 400) => c.json({ error: { message } }, status);

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, initialState(config));
}

export const contract = {
  provider: 'postbridge',
  source: 'Post Bridge help center API article and product docs subset',
  docs: 'https://support.post-bridge.com/api',
  baseUrl: 'https://api.post-bridge.com',
  scope: ['me', 'accounts', 'media', 'posts', 'post_update_delete', 'publish', 'analytics'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'postbridge',
  register(app, store) {
    app.get('/v1/me', (c) => c.json({ data: state(store).user }));
    app.get('/v1/accounts', (c) => c.json({ data: state(store).accounts }));
    app.get('/v1/accounts/:id', (c) => {
      const account = state(store).accounts.find((item) => item.id === c.req.param('id'));
      return account ? c.json({ data: account }) : error(c, 'Account not found', 404);
    });
    app.get('/v1/media', (c) => c.json({ data: state(store).media }));
    app.post('/v1/media', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      const media = { id: createToken('media_emulator', current.nextMedia++), url: body.url ?? `https://cdn.post-bridge.test/media/${current.nextMedia}.jpg`, type: body.type ?? 'image', status: 'ready', created_at: fixedNow };
      current.media.push(media);
      save(store, current);
      return c.json({ data: media }, 201);
    });
    app.get('/v1/posts', (c) => {
      const current = state(store);
      const platform = c.req.query('platform');
      const posts = platform ? current.posts.filter((post) => post.platforms.includes(platform)) : current.posts;
      return c.json({ data: posts });
    });
    app.get('/v1/posts/:id', (c) => {
      const post = state(store).posts.find((item) => item.id === c.req.param('id'));
      return post ? c.json({ data: post }) : error(c, 'Post not found', 404);
    });
    app.post('/v1/posts', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      if (!body.caption && !body.text) return error(c, 'caption is required');
      const post = {
        id: createToken('post_emulator', current.nextPost++),
        caption: body.caption ?? body.text,
        media_urls: body.media_urls ?? [],
        platforms: body.platforms ?? [body.platform ?? 'instagram'],
        account_ids: body.account_ids ?? [],
        status: body.scheduled_at ? 'scheduled' : 'draft',
        scheduled_at: body.scheduled_at ?? null,
        created_at: fixedNow,
      };
      current.posts.unshift(post);
      save(store, current);
      return c.json({ data: post }, 201);
    });
    app.patch('/v1/posts/:id', async (c) => {
      const current = state(store);
      const post = current.posts.find((item) => item.id === c.req.param('id'));
      if (!post) return error(c, 'Post not found', 404);
      Object.assign(post, await readBody(c), { updated_at: fixedNow });
      save(store, current);
      return c.json({ data: post });
    });
    app.delete('/v1/posts/:id', (c) => {
      const current = state(store);
      const before = current.posts.length;
      current.posts = current.posts.filter((item) => item.id !== c.req.param('id'));
      if (current.posts.length === before) return error(c, 'Post not found', 404);
      save(store, current);
      return c.json({ data: { deleted: true, id: c.req.param('id') } });
    });
    app.post('/v1/posts/:id/publish', (c) => {
      const current = state(store);
      const post = current.posts.find((item) => item.id === c.req.param('id'));
      if (!post) return error(c, 'Post not found', 404);
      post.status = 'published';
      post.published_at = fixedNow;
      save(store, current);
      return c.json({ data: post });
    });
    app.get('/v1/analytics/posts/:id', (c) => {
      const metrics = state(store).analytics.find((item) => item.post_id === c.req.param('id')) ?? { post_id: c.req.param('id'), impressions: 0, likes: 0, comments: 0, shares: 0 };
      return c.json({ data: metrics });
    });
    app.get('/postbridge/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Post Bridge API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { postbridge: initialState() };
export default plugin;
