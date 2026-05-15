const STATE_KEY = 'craigslist:state';

function now() {
  return new Date().toISOString();
}

function initialState(config = {}) {
  return {
    listings: config.listings ?? [{
      id: 'cl_listing_seed',
      area: 'sfbay',
      category: 'ggg',
      title: 'Need help picking up a marketplace order',
      body: 'Short errand near downtown. Perfect human-in-the-loop task.',
      price: 40,
      currency: 'USD',
      location: 'San Francisco, CA',
      url: 'https://sfbay.craigslist.org/ggg/cl_listing_seed.html',
      posted_at: now(),
      status: 'active',
    }],
    posts: config.posts ?? [],
    accountMessages: config.accountMessages ?? [{ messageId: 'msg_emulator', message: 'System maintenance tonight.' }],
    images: config.images ?? {},
    nextPost: 1,
    nextImage: 1,
  };
}

function state(store) {
  const current = store.getData?.(STATE_KEY);
  if (current) return current;
  const next = initialState();
  store.setData?.(STATE_KEY, next);
  return next;
}

function saveState(store, next) {
  store.setData?.(STATE_KEY, next);
}

async function body(c) {
  const text = await c.req.text?.().catch(() => '');
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }
  return c.req.json?.().catch(() => ({})) ?? {};
}

function matches(c, listings) {
  const query = (c.req.query?.('query') ?? c.req.query?.('q') ?? '').toLowerCase();
  const minPrice = Number(c.req.query?.('min_price') ?? 0);
  const maxPrice = Number(c.req.query?.('max_price') ?? Number.MAX_SAFE_INTEGER);
  return listings.filter((listing) => {
    if (query && !`${listing.title} ${listing.body}`.toLowerCase().includes(query)) return false;
    if (listing.price < minPrice || listing.price > maxPrice) return false;
    return true;
  });
}

function rss(listings) {
  const items = listings.map((listing) => `<item><guid>${listing.id}</guid><title>${listing.title}</title><link>${listing.url}</link><description>${listing.body}</description><pubDate>${new Date(listing.posted_at).toUTCString()}</pubDate></item>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>craigslist emulator</title>${items}</channel></rss>`;
}

function envelope(data, s, errors = []) {
  return { apiVersion: 1, data, errors, accountMessages: s.accountMessages };
}

function money(amount) {
  return { amount, currency: 'USD', exponent: 2 };
}

function postingStats(postingId) {
  const day = Math.floor(Date.now() / 1000 / 86400) * 86400 - 86400;
  return {
    postingId,
    impressions: [[day, 57]],
    views: [[day, 19]],
    contact: [[day, 4]],
    contact_chat: [[day, 1]],
    contact_phone: [[day, 1]],
    contact_email: [[day, 3]],
    share: [[day, 1]],
    favorite: [[day, 1]],
  };
}

function findPost(s, id) {
  return s.posts.find((item) => item.id === id) ?? s.listings.find((item) => item.id === id);
}

export const contract = {
  provider: 'craigslist',
  source: 'Craigslist Bulkpost OpenAPI, RSS bulk posting, and search/RSS-compatible subset',
  docs: 'https://bapi.craigslist.org/bulkpost-docs/v1/',
  scope: ['oauth-token', 'account-billing', 'account-messages', 'account-stats', 'zip-area', 'posting-body', 'posting-images', 'posting-price', 'posting-remuneration', 'posting-status', 'delete-undelete', 'search-json', 'search-rss', 'legacy-bulk-posting', 'state-inspection'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'craigslist',
  register(app, store) {
    app.post('/bulkpost/oauth/access-token', (c) => c.json({ access_token: 'craigslist_emulator_access_token', expires_in: 3600, scopes: ['bulkpost.posting bulkpost.account.billing bulkpost.account.message bulkpost.account.stats'], token_type: 'Bearer' }));

    app.get('/bulkpost/v1/account/billing/credit', (c) => c.json(envelope({ creditLine: money(100000), creditRemaining: money(300), creditUsed: money(700) }, state(store))));
    app.get('/bulkpost/v1/account/billing/current-pricing/area/:areaAbbr/category/:categoryAbbr', (c) => c.json(envelope({ area: c.req.param('areaAbbr'), cat: c.req.param('categoryAbbr'), currentPricing: money(2500) }, state(store))));
    app.post('/bulkpost/v1/account/billing/make-invoice', (c) => c.json(envelope({ invoiceIDs: ['invoice_emulator'] }, state(store))));
    app.get('/bulkpost/v1/account/billing/posting-block-balances', (c) => c.json(envelope([{ area: 'sfo', productClass: 'GIG', productName: 'san francisco gigs block', remainingPosts: 3 }], state(store))));
    app.put('/bulkpost/v1/account/message/:messageId/ack', (c) => {
      const s = state(store);
      s.accountMessages = s.accountMessages.filter((message) => message.messageId !== c.req.param('messageId'));
      saveState(store, s);
      return c.json(envelope({ message: 'account message acknowledged' }, s));
    });
    app.get('/bulkpost/v1/account/stats/all-postings', (c) => {
      const s = state(store);
      return c.json(envelope((s.posts.length ? s.posts : s.listings).map((post) => postingStats(post.id)), s));
    });
    app.get('/bulkpost/v1/account/stats/posting/:postingId', (c) => c.json(envelope([postingStats(c.req.param('postingId'))], state(store))));
    app.get('/bulkpost/v1/posting/zip/:zip/area', (c) => c.json(envelope({ abbreviation: c.req.param('zip') === '94105' ? 'sfo' : 'bos', description: c.req.param('zip') === '94105' ? 'san francisco' : 'boston' }, state(store))));

    app.get('/bulkpost/v1/postings/:postingId', (c) => {
      const s = state(store);
      const post = findPost(s, c.req.param('postingId'));
      return post ? c.json(envelope(post, s)) : c.json(envelope({}, s, [{ message: `posting ${c.req.param('postingId')} not found` }]), 404);
    });
    app.patch('/bulkpost/v1/postings/:postingId', async (c) => {
      const s = state(store);
      const post = findPost(s, c.req.param('postingId'));
      if (!post) return c.json(envelope({}, s, [{ message: 'posting not found' }]), 404);
      Object.assign(post, await body(c));
      saveState(store, s);
      return c.json(envelope(post, s));
    });
    app.delete('/bulkpost/v1/postings/:postingId', (c) => {
      const s = state(store);
      const post = findPost(s, c.req.param('postingId'));
      if (!post) return c.json(envelope({}, s, [{ message: 'posting not found' }]), 404);
      post.status = 'deleted';
      saveState(store, s);
      return c.json(envelope({ message: `posting ${post.id} has been deleted` }, s));
    });
    app.get('/bulkpost/v1/postings/:postingId/body', (c) => c.json(envelope({ body: findPost(state(store), c.req.param('postingId'))?.body ?? '' }, state(store))));
    app.put('/bulkpost/v1/postings/:postingId/body', async (c) => {
      const s = state(store);
      const post = findPost(s, c.req.param('postingId'));
      const input = await body(c);
      if (post) post.body = input.body ?? input.raw ?? post.body;
      saveState(store, s);
      return c.json(envelope({ body: post?.body ?? input.body ?? '', message: 'posting body updated successfully' }, s));
    });
    app.get('/bulkpost/v1/postings/:postingId/images', (c) => c.json(envelope({ imageInfo: state(store).images[c.req.param('postingId')] ?? [] }, state(store))));
    app.post('/bulkpost/v1/postings/:postingId/images', async (c) => {
      const s = state(store);
      const input = await body(c);
      const image = { id: input.id ?? `4:image_${s.nextImage++}`, filename: input.filename ?? '/file/emulator.webp', format: 'WEBP', width: 1201, height: 570, position: (s.images[c.req.param('postingId')] ?? []).length };
      s.images[c.req.param('postingId')] ??= [];
      s.images[c.req.param('postingId')].push(image);
      saveState(store, s);
      return c.json(envelope({ imageInfo: s.images[c.req.param('postingId')] }, s), 201);
    });
    app.put('/bulkpost/v1/postings/:postingId/images', async (c) => {
      const s = state(store);
      s.images[c.req.param('postingId')] = (await body(c)).images ?? [];
      saveState(store, s);
      return c.json(envelope({ imageInfo: s.images[c.req.param('postingId')] }, s));
    });
    app.get('/bulkpost/v1/postings/:postingId/images/:imageId', (c) => c.json(envelope((state(store).images[c.req.param('postingId')] ?? []).find((image) => image.id === c.req.param('imageId')) ?? {}, state(store))));
    app.delete('/bulkpost/v1/postings/:postingId/images/:imageId', (c) => {
      const s = state(store);
      s.images[c.req.param('postingId')] = (s.images[c.req.param('postingId')] ?? []).filter((image) => image.id !== c.req.param('imageId'));
      saveState(store, s);
      return c.json(envelope({ message: `image ${c.req.param('imageId')} removed successfully from posting ${c.req.param('postingId')}` }, s));
    });
    app.get('/bulkpost/v1/postings/:postingId/price', (c) => c.json(envelope({ price: findPost(state(store), c.req.param('postingId'))?.price ?? 0 }, state(store))));
    app.put('/bulkpost/v1/postings/:postingId/price', async (c) => {
      const s = state(store);
      const post = findPost(s, c.req.param('postingId'));
      const input = await body(c);
      if (post) post.price = Number(input.price ?? post.price);
      saveState(store, s);
      return c.json(envelope({ message: 'price changed successfully', price: post?.price ?? Number(input.price ?? 0) }, s));
    });
    app.get('/bulkpost/v1/postings/:postingId/remuneration', (c) => c.json(envelope({ remuneration: findPost(state(store), c.req.param('postingId'))?.remuneration ?? '$40/task' }, state(store))));
    app.put('/bulkpost/v1/postings/:postingId/remuneration', async (c) => {
      const s = state(store);
      const post = findPost(s, c.req.param('postingId'));
      const input = await body(c);
      if (post) post.remuneration = input.remuneration ?? input.raw ?? post.remuneration;
      saveState(store, s);
      return c.json(envelope({ message: 'remuneration changed successfully', remuneration: post?.remuneration ?? input.remuneration ?? '' }, s));
    });
    app.get('/bulkpost/v1/postings/:postingId/status', (c) => c.json(envelope({ status: findPost(state(store), c.req.param('postingId'))?.status ?? 'active' }, state(store))));
    app.put('/bulkpost/v1/postings/:postingId/status', async (c) => {
      const s = state(store);
      const post = findPost(s, c.req.param('postingId'));
      const input = await body(c);
      if (post) post.status = input.status ?? post.status;
      saveState(store, s);
      return c.json(envelope({ status: post?.status ?? input.status ?? 'active' }, s));
    });
    app.put('/bulkpost/v1/postings/:postingId/undelete', (c) => {
      const s = state(store);
      const post = findPost(s, c.req.param('postingId'));
      if (post) post.status = 'active';
      saveState(store, s);
      return c.json(envelope({ message: `posting ${c.req.param('postingId')} has been undeleted` }, s));
    });

    app.get('/search/:area/:category.json', (c) => {
      const items = matches(c, state(store).listings.filter((listing) => listing.area === c.req.param('area') && listing.category === c.req.param('category')));
      return c.json({ results: items, count: items.length });
    });
    app.get('/search/:area/:category.rss', (c) => {
      const items = matches(c, state(store).listings.filter((listing) => listing.area === c.req.param('area') && listing.category === c.req.param('category')));
      return c.text?.(rss(items), 200, { 'content-type': 'application/rss+xml' }) ?? c.json({ rss: rss(items) });
    });
    app.get('/:area/search/:category', (c) => {
      const items = matches(c, state(store).listings.filter((listing) => listing.area === c.req.param('area') && listing.category === c.req.param('category')));
      return c.json({ results: items, count: items.length });
    });
    app.get('/:area/search/:category/rss', (c) => {
      const items = matches(c, state(store).listings.filter((listing) => listing.area === c.req.param('area') && listing.category === c.req.param('category')));
      return c.text?.(rss(items), 200, { 'content-type': 'application/rss+xml' }) ?? c.json({ rss: rss(items) });
    });

    app.post('/posting/bulk', async (c) => {
      const s = state(store);
      const input = await body(c);
      const rows = Array.isArray(input.posts) ? input.posts : [input];
      const created = rows.map((row) => {
        const id = row.id ?? `cl_post_${s.nextPost++}`;
        const post = {
          id,
          area: row.area ?? 'sfbay',
          category: row.category ?? 'ggg',
          title: row.title ?? 'Emulator Craigslist post',
          body: row.body ?? row.description ?? '',
          price: row.price ?? 0,
          currency: row.currency ?? 'USD',
          location: row.location ?? 'San Francisco, CA',
          url: `https://${row.area ?? 'sfbay'}.craigslist.org/${row.category ?? 'ggg'}/${id}.html`,
          posted_at: now(),
          status: 'active',
        };
        s.posts.push(post);
        s.listings.push(post);
        return post;
      });
      saveState(store, s);
      return c.json({ posts: created, status: 'ok' }, 201);
    });
    app.get('/posts', (c) => c.json({ posts: state(store).posts }));
    app.get('/posts/:postId', (c) => {
      const post = state(store).posts.find((item) => item.id === c.req.param('postId'));
      return post ? c.json(post) : c.json({ error: 'not_found' }, 404);
    });
    app.delete('/posts/:postId', (c) => {
      const s = state(store);
      const post = s.posts.find((item) => item.id === c.req.param('postId'));
      if (!post) return c.json({ error: 'not_found' }, 404);
      post.status = 'deleted';
      s.listings = s.listings.filter((listing) => listing.id !== post.id);
      saveState(store, s);
      return c.json(post);
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Craigslist API emulator';
export const endpoints = 'Search JSON, RSS, bulk posting, post management, and state inspection';
export const capabilities = contract.scope;
export const initConfig = { craigslist: initialState() };
export default plugin;
