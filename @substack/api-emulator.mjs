import { createToken, fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'substack:state';

function initialState(config = {}) {
  return {
    publication: { id: 1001, subdomain: 'emulator', name: 'Emulator Letter', custom_domain: null, hero_text: 'Local Substack API testing' },
    posts: [{
      id: 2001,
      slug: 'hello-emulator',
      title: 'Hello Emulator',
      subtitle: 'A deterministic Substack post',
      audience: 'everyone',
      type: 'newsletter',
      post_date: fixedNow,
      canonical_url: 'https://emulator.substack.com/p/hello-emulator',
      body_html: '<p>Hello from the emulator.</p>',
    }],
    subscribers: [{ id: 3001, email: 'reader@example.com', name: 'Reader Example', subscription_status: 'active', created_at: fixedNow }],
    comments: [{ id: 4001, post_id: 2001, body: 'Great post.', name: 'Reader Example', created_at: fixedNow }],
    recommendations: [{ id: 5001, subdomain: 'recommended', name: 'Recommended Letter', description: 'A related publication' }],
    nextPost: 2002,
    nextSubscriber: 3002,
    nextComment: 4002,
    ...config,
  };
}

const state = (store) => getState(store, STATE_KEY, () => initialState());
const save = (store, next) => setState(store, STATE_KEY, next);
const error = (c, message, status = 400) => c.json({ error: message }, status);

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, initialState(config));
}

export const contract = {
  provider: 'substack',
  source: 'Substack public/unofficial API-compatible publication subset',
  docs: 'https://substack-api.readthedocs.io/',
  baseUrl: 'https://substack.com',
  scope: ['publication', 'posts', 'post_update_delete', 'subscribers', 'comments', 'recommendations'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'substack',
  register(app, store) {
    app.get('/api/v1/publication', (c) => c.json(state(store).publication));
    app.get('/api/v1/posts', (c) => c.json({ posts: state(store).posts }));
    app.get('/api/v1/posts/:id', (c) => {
      const post = state(store).posts.find((item) => String(item.id) === c.req.param('id') || item.slug === c.req.param('id'));
      return post ? c.json(post) : error(c, 'Post not found', 404);
    });
    app.post('/api/v1/posts', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      if (!body.title) return error(c, 'title is required');
      const slug = body.slug ?? String(body.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const post = { id: current.nextPost++, slug, title: body.title, subtitle: body.subtitle ?? '', audience: body.audience ?? 'everyone', type: body.type ?? 'newsletter', draft: body.draft ?? true, post_date: body.post_date ?? fixedNow, canonical_url: `https://${current.publication.subdomain}.substack.com/p/${slug}`, body_html: body.body_html ?? body.body ?? '' };
      current.posts.unshift(post);
      save(store, current);
      return c.json(post, 201);
    });
    app.patch('/api/v1/posts/:id', async (c) => {
      const current = state(store);
      const post = current.posts.find((item) => String(item.id) === c.req.param('id') || item.slug === c.req.param('id'));
      if (!post) return error(c, 'Post not found', 404);
      Object.assign(post, await readBody(c), { updated_at: fixedNow });
      save(store, current);
      return c.json(post);
    });
    app.delete('/api/v1/posts/:id', (c) => {
      const current = state(store);
      const before = current.posts.length;
      current.posts = current.posts.filter((item) => String(item.id) !== c.req.param('id') && item.slug !== c.req.param('id'));
      if (current.posts.length === before) return error(c, 'Post not found', 404);
      save(store, current);
      return c.json({ deleted: true, id: c.req.param('id') });
    });
    app.get('/api/v1/subscribers', (c) => c.json({ subscribers: state(store).subscribers }));
    app.post('/api/v1/subscribers', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      if (!body.email) return error(c, 'email is required');
      const subscriber = { id: current.nextSubscriber++, email: body.email, name: body.name ?? '', subscription_status: 'active', created_at: fixedNow };
      current.subscribers.push(subscriber);
      save(store, current);
      return c.json(subscriber, 201);
    });
    app.get('/api/v1/posts/:id/comments', (c) => {
      const post = state(store).posts.find((item) => String(item.id) === c.req.param('id') || item.slug === c.req.param('id'));
      if (!post) return error(c, 'Post not found', 404);
      return c.json({ comments: state(store).comments.filter((comment) => String(comment.post_id) === String(post.id)) });
    });
    app.post('/api/v1/posts/:id/comments', async (c) => {
      const current = state(store);
      const post = current.posts.find((item) => String(item.id) === c.req.param('id') || item.slug === c.req.param('id'));
      if (!post) return error(c, 'Post not found', 404);
      const body = await readBody(c);
      const comment = { id: current.nextComment++, post_id: post.id, body: body.body ?? body.comment ?? '', name: body.name ?? 'Anonymous', created_at: fixedNow };
      current.comments.push(comment);
      save(store, current);
      return c.json(comment, 201);
    });
    app.get('/api/v1/recommendations', (c) => c.json({ recommendations: state(store).recommendations }));
    app.get('/substack/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Substack API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { substack: initialState() };
export default plugin;
