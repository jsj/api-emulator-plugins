import { fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'nextdoor:state';

function defaultState(config = {}) {
  return {
    member: config.member ?? {
      id: 'nd_member_emulator',
      first_name: 'Local',
      last_name: 'Neighbor',
      display_name: 'Local Neighbor',
      email: 'neighbor@example.local',
    },
    profiles: config.profiles ?? [
      {
        id: 'nd_profile_home',
        type: 'neighbor',
        neighborhood_id: 'nd_neighborhood_local',
        neighborhood_name: 'Emulator Heights',
        city: 'Localhost',
        state: 'CA',
        country: 'US',
        scopes: ['profile:read', 'post:write', 'search:read'],
      },
    ],
    posts: config.posts ?? [
      {
        id: 'nd_post_seed',
        profile_id: 'nd_profile_home',
        author_id: 'nd_member_emulator',
        subject: 'Welcome to Emulator Heights',
        body: 'This seeded Nextdoor post is safe for local CLI and SDK tests.',
        category: 'general',
        status: 'published',
        created_at: fixedNow,
        updated_at: fixedNow,
        permalink: 'https://nextdoor.com/p/nd_post_seed/',
      },
    ],
    businesses: config.businesses ?? [
      {
        id: 'nd_business_seed',
        name: 'Localhost Hardware',
        category: 'Home Services',
        neighborhood_id: 'nd_neighborhood_local',
        address: { locality: 'Localhost', region: 'CA', country: 'US' },
      },
    ],
    nextPost: 2,
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);

function page(items, c) {
  const limit = Math.max(1, Math.min(Number(c.req.query('limit') ?? c.req.query('page_size') ?? 25), 100));
  const pageToken = Number(c.req.query('page') ?? c.req.query('page_token') ?? 1) || 1;
  const offset = (pageToken - 1) * limit;
  return {
    data: items.slice(offset, offset + limit),
    pagination: {
      total: items.length,
      limit,
      page: pageToken,
      next_page_token: offset + limit < items.length ? String(pageToken + 1) : null,
    },
  };
}

function search(items, term, fields) {
  const q = String(term ?? '').toLowerCase();
  if (!q) return items;
  return items.filter((item) => fields.some((field) => String(item[field] ?? '').toLowerCase().includes(q)));
}

export function seedFromConfig(store, _baseUrl = 'https://api.nextdoor.com', config = {}) {
  return save(store, defaultState(config));
}

export const contract = {
  provider: 'nextdoor',
  source: 'Nextdoor developer reference and Ads API Postman-compatible local subset',
  docs: 'https://developer.nextdoor.com/reference/me-1',
  baseUrl: 'https://api.nextdoor.com',
  scope: ['me', 'profiles', 'posts', 'post-search', 'business-search'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'nextdoor',
  register(app, store) {
    app.get('/me', (c) => c.json({ data: state(store).member }));
    app.get('/me/profiles', (c) => c.json(page(state(store).profiles, c)));

    app.get('/posts', (c) => {
      const profileId = c.req.query('profile_id');
      const posts = state(store).posts.filter((post) => !profileId || post.profile_id === profileId);
      return c.json(page(posts, c));
    });

    app.post('/posts', async (c) => {
      const s = state(store);
      const body = await readBody(c);
      const profileId = body.profile_id ?? s.profiles[0]?.id;
      if (!s.profiles.some((profile) => profile.id === profileId)) return routeError(c, 'Profile not found', 404, 'profile_not_found');
      const post = {
        id: `nd_post_${String(s.nextPost++).padStart(6, '0')}`,
        profile_id: profileId,
        author_id: s.member.id,
        subject: body.subject ?? body.title ?? 'Emulator post',
        body: body.body ?? body.text ?? '',
        category: body.category ?? 'general',
        status: body.status ?? 'published',
        created_at: fixedNow,
        updated_at: fixedNow,
        permalink: `https://nextdoor.com/p/nd_post_${String(s.nextPost - 1).padStart(6, '0')}/`,
      };
      s.posts.unshift(post);
      save(store, s);
      return c.json({ data: post }, 201);
    });

    app.get('/posts/:id', (c) => {
      const post = state(store).posts.find((item) => item.id === c.req.param('id'));
      return post ? c.json({ data: post }) : routeError(c, 'Post not found', 404, 'post_not_found');
    });

    app.get('/search-posts', (c) => c.json(page(search(state(store).posts, c.req.query('q') ?? c.req.query('query'), ['subject', 'body', 'category']), c)));
    app.get('/search/posts', (c) => c.json(page(search(state(store).posts, c.req.query('q') ?? c.req.query('query'), ['subject', 'body', 'category']), c)));
    app.get('/search-businesses', (c) => c.json(page(search(state(store).businesses, c.req.query('q') ?? c.req.query('query'), ['name', 'category']), c)));
    app.get('/search/businesses', (c) => c.json(page(search(state(store).businesses, c.req.query('q') ?? c.req.query('query'), ['name', 'category']), c)));
    app.get('/nextdoor/inspect/state', (c) => c.json(state(store)));
  },
  seed(store, baseUrl, config = {}) {
    seedFromConfig(store, baseUrl, config);
  },
};

export const label = 'Nextdoor API emulator';
export const endpoints = 'member profile, profiles, posts, post search, business search';
export const initConfig = { nextdoor: { accessToken: 'nextdoor_emulator_token', profileId: 'nd_profile_home' } };

export default plugin;
