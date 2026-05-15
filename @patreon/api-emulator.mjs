import { createToken, fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'patreon:state';

const resource = (type, id, attributes = {}, relationships = {}) => ({ type, id: String(id), attributes, relationships });

function initialState(config = {}) {
  return {
    tokenCount: 0,
    identity: resource('user', 'user_emulator', { full_name: 'Emulator Creator', email: 'creator@example.com', vanity: 'emulator' }),
    campaigns: [resource('campaign', 'campaign_emulator', { creation_name: 'Emulator Studio', name: 'Emulator Studio', currency: 'USD', patron_count: 2, summary: 'Local Patreon API testing' })],
    members: [resource('member', 'member_emulator_1', { full_name: 'Ada Patron', email: 'ada@example.com', patron_status: 'active_patron', currently_entitled_amount_cents: 500, pledge_relationship_start: fixedNow })],
    posts: [resource('post', 'post_emulator_1', { title: 'Emulator Update', content: '<p>Thanks patrons.</p>', published_at: fixedNow, url: 'https://www.patreon.com/posts/post-emulator-1' })],
    tiers: [resource('tier', 'tier_emulator_1', { title: 'Supporter', amount_cents: 500, published: true, patron_count: 2 })],
    lives: [],
    webhooks: [],
    nextLive: 1,
    nextWebhook: 1,
    ...config,
  };
}

const state = (store) => getState(store, STATE_KEY, () => initialState());
const save = (store, next) => setState(store, STATE_KEY, next);
const document = (data, included = []) => ({ data, included, links: { self: '' } });
const error = (c, detail, status = 400) => c.json({ errors: [{ status: String(status), detail }] }, status);

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, initialState(config));
}

export const contract = {
  provider: 'patreon',
  source: 'Official Patreon API v2 JSON:API docs subset',
  docs: 'https://docs.patreon.com/',
  baseUrl: 'https://www.patreon.com',
  scope: ['oauth_token', 'identity', 'campaigns', 'members', 'posts', 'tiers', 'lives', 'webhooks'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'patreon',
  register(app, store) {
    app.post('/api/oauth2/token', (c) => {
      const current = state(store);
      current.tokenCount += 1;
      save(store, current);
      return c.json({ access_token: createToken('patreon_access', current.tokenCount), refresh_token: createToken('patreon_refresh', current.tokenCount), expires_in: 2678400, token_type: 'Bearer', scope: 'identity campaigns.members campaigns.posts' });
    });
    app.get('/api/oauth2/v2/identity', (c) => c.json(document(state(store).identity)));
    app.get('/api/oauth2/v2/campaigns', (c) => c.json(document(state(store).campaigns)));
    app.get('/api/oauth2/v2/campaigns/:id', (c) => {
      const campaign = state(store).campaigns.find((item) => item.id === c.req.param('id'));
      return campaign ? c.json(document(campaign)) : error(c, 'Campaign not found', 404);
    });
    app.get('/api/oauth2/v2/campaigns/:id/members', (c) => c.json(document(state(store).members)));
    app.get('/api/oauth2/v2/campaigns/:id/tiers', (c) => c.json(document(state(store).tiers)));
    app.get('/api/oauth2/v2/members/:id', (c) => {
      const member = state(store).members.find((item) => item.id === c.req.param('id'));
      return member ? c.json(document(member)) : error(c, 'Member not found', 404);
    });
    app.get('/api/oauth2/v2/campaigns/:id/posts', (c) => c.json(document(state(store).posts)));
    app.get('/api/oauth2/v2/posts/:id', (c) => {
      const post = state(store).posts.find((item) => item.id === c.req.param('id'));
      return post ? c.json(document(post)) : error(c, 'Post not found', 404);
    });
    app.get('/api/oauth2/v2/webhooks', (c) => c.json(document(state(store).webhooks)));
    app.post('/api/oauth2/v2/webhooks', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      const attrs = body.data?.attributes ?? body;
      const webhook = resource('webhook', createToken('webhook_emulator', current.nextWebhook++), { uri: attrs.uri, triggers: attrs.triggers ?? ['members:create'], secret: createToken('secret', current.nextWebhook) });
      current.webhooks.push(webhook);
      save(store, current);
      return c.json(document(webhook), 201);
    });
    app.patch('/api/oauth2/v2/webhooks/:id', async (c) => {
      const current = state(store);
      const webhook = current.webhooks.find((item) => item.id === c.req.param('id'));
      if (!webhook) return error(c, 'Webhook not found', 404);
      Object.assign(webhook.attributes, (await readBody(c)).data?.attributes ?? {});
      save(store, current);
      return c.json(document(webhook));
    });
    app.delete('/api/oauth2/v2/webhooks/:id', (c) => {
      const current = state(store);
      const before = current.webhooks.length;
      current.webhooks = current.webhooks.filter((item) => item.id !== c.req.param('id'));
      if (current.webhooks.length === before) return error(c, 'Webhook not found', 404);
      save(store, current);
      return c.json(null, 204);
    });
    app.post('/api/oauth2/v2/lives', async (c) => {
      const current = state(store);
      const attrs = (await readBody(c)).data?.attributes ?? {};
      const live = resource('live', createToken('live_emulator', current.nextLive++), { title: attrs.title ?? 'Emulator Live', status: attrs.status ?? 'scheduled', starts_at: attrs.starts_at ?? fixedNow });
      current.lives.push(live);
      save(store, current);
      return c.json(document(live), 201);
    });
    app.get('/api/oauth2/v2/lives/:id', (c) => {
      const live = state(store).lives.find((item) => item.id === c.req.param('id'));
      return live ? c.json(document(live)) : error(c, 'Live not found', 404);
    });
    app.patch('/api/oauth2/v2/lives/:id', async (c) => {
      const current = state(store);
      const live = current.lives.find((item) => item.id === c.req.param('id'));
      if (!live) return error(c, 'Live not found', 404);
      Object.assign(live.attributes, (await readBody(c)).data?.attributes ?? {});
      save(store, current);
      return c.json(document(live));
    });
    app.get('/patreon/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Patreon API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { patreon: initialState() };
export default plugin;
