import { createToken, fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'x:state';

function defaultState() {
  return {
    tokenCount: 0,
    users: [{ id: '2244994945', username: 'x_emulator', name: 'X Emulator', verified: false, created_at: fixedNow }],
    tweets: [{ id: '1000000000000000001', text: 'Hello from the X API emulator', author_id: '2244994945', created_at: fixedNow, public_metrics: { retweet_count: 0, reply_count: 0, like_count: 1, quote_count: 0 } }],
  };
}

const state = (store) => getState(store, STATE_KEY, defaultState);

export function seedFromConfig(store, baseUrl = 'https://api.x.com', config = {}) {
  return setState(store, STATE_KEY, { ...defaultState(), baseUrl, ...config });
}

export const contract = {
  provider: 'x',
  source: 'X API v2 documented subset',
  docs: 'https://developer.x.com/en/docs/x-api',
  baseUrl: 'https://api.x.com',
  scope: ['oauth2_token', 'users', 'tweets'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'x',
  register(app, store) {
    app.post('/2/oauth2/token', (c) => {
      const current = state(store);
      current.tokenCount += 1;
      return c.json({ token_type: 'bearer', expires_in: 7200, access_token: createToken('x_access', current.tokenCount), scope: 'tweet.read tweet.write users.read offline.access' });
    });
    app.get('/2/users/me', (c) => c.json({ data: state(store).users[0] }));
    app.get('/2/users/:id', (c) => {
      const user = state(store).users.find((item) => item.id === c.req.param('id'));
      if (!user) return routeError(c, 'User not found', 404, 'not_found');
      return c.json({ data: user });
    });
    app.get('/2/users/:id/tweets', (c) => c.json({ data: state(store).tweets.filter((tweet) => tweet.author_id === c.req.param('id')), meta: { result_count: state(store).tweets.length } }));
    app.get('/2/tweets', (c) => {
      const ids = (c.req.query('ids') ?? '').split(',').filter(Boolean);
      const tweets = state(store).tweets.filter((tweet) => ids.length === 0 || ids.includes(tweet.id));
      return c.json({ data: tweets });
    });
    app.post('/2/tweets', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      const tweet = { id: String(1000000000000000002n + BigInt(current.tweets.length)), text: body.text ?? '', author_id: current.users[0].id, created_at: fixedNow };
      current.tweets.unshift(tweet);
      return c.json({ data: { id: tweet.id, text: tweet.text } }, 201);
    });
    app.get('/x/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'X API emulator';
export const endpoints = 'OAuth token, users, tweets';
export const initConfig = { x: { bearerToken: 'x-emulator-token', clientId: 'x-emulator-client' } };

export default plugin;
