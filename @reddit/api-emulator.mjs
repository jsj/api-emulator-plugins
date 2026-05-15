import { createToken, fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'reddit:state';

function defaultState() {
  return {
    tokenCount: 0,
    me: { name: 'reddit_emulator', id: 't2_emulator', created_utc: 1767225600, link_karma: 42, comment_karma: 7, is_employee: false },
    subreddits: {
      emulator: { display_name: 'emulator', title: 'API Emulator', public_description: 'Deterministic local Reddit API responses.', subscribers: 1234, over18: false },
    },
    posts: [{ id: 'abc123', name: 't3_abc123', subreddit: 'emulator', title: 'Hello from the Reddit emulator', author: 'reddit_emulator', permalink: '/r/emulator/comments/abc123/hello_from_the_reddit_emulator/', url: 'https://example.test/reddit-emulator', created_utc: 1767225600, score: 10, num_comments: 1 }],
  };
}

const state = (store) => getState(store, STATE_KEY, defaultState);

function listing(children) {
  return { kind: 'Listing', data: { after: null, before: null, dist: children.length, modhash: '', geo_filter: '', children: children.map((data) => ({ kind: data.name?.startsWith('t5_') ? 't5' : 't3', data })) } };
}

export function seedFromConfig(store, baseUrl = 'https://oauth.reddit.com', config = {}) {
  return setState(store, STATE_KEY, { ...defaultState(), baseUrl, ...config });
}

export const contract = {
  provider: 'reddit',
  source: 'Reddit API documented subset',
  docs: 'https://www.reddit.com/dev/api/',
  baseUrl: 'https://oauth.reddit.com',
  scope: ['oauth_token', 'me', 'subreddit_about', 'listing', 'submit'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'reddit',
  register(app, store) {
    app.post('/api/v1/access_token', (c) => {
      const current = state(store);
      current.tokenCount += 1;
      return c.json({ access_token: createToken('reddit_access', current.tokenCount), token_type: 'bearer', expires_in: 3600, scope: 'identity read submit' });
    });
    app.get('/api/v1/me', (c) => c.json(state(store).me));
    app.get('/r/:subreddit/about', (c) => {
      const sub = state(store).subreddits[c.req.param('subreddit')] ?? state(store).subreddits.emulator;
      return c.json({ kind: 't5', data: { id: `t5_${sub.display_name}`, name: `t5_${sub.display_name}`, ...sub } });
    });
    app.get('/r/:subreddit/hot', (c) => c.json(listing(state(store).posts.filter((post) => post.subreddit === c.req.param('subreddit')))));
    app.get('/r/:subreddit/new', (c) => c.json(listing(state(store).posts.filter((post) => post.subreddit === c.req.param('subreddit')))));
    app.post('/api/submit', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      const id = `smoke${current.posts.length + 1}`;
      const post = { id, name: `t3_${id}`, subreddit: body.sr ?? 'emulator', title: body.title ?? 'Untitled emulator post', author: current.me.name, permalink: `/r/${body.sr ?? 'emulator'}/comments/${id}/`, url: body.url ?? '', created_utc: Math.floor(new Date(fixedNow).getTime() / 1000), score: 1, num_comments: 0 };
      current.posts.unshift(post);
      return c.json({ json: { errors: [], data: { id, name: post.name, url: post.permalink } } });
    });
    app.get('/reddit/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Reddit API emulator';
export const endpoints = 'OAuth token, identity, subreddit listings, submit';
export const initConfig = { reddit: { clientId: 'reddit-emulator-client', clientSecret: 'reddit-emulator-secret' } };

export default plugin;
