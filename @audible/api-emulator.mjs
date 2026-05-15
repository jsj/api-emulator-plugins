import { fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'audible:state';

function product(config = {}) {
  return {
    asin: config.asin ?? 'B0EMU00001',
    title: config.title ?? 'Localhost Listening',
    subtitle: config.subtitle ?? 'An API Emulator Audiobook',
    authors: config.authors ?? [{ name: 'API Emulator' }],
    narrators: config.narrators ?? [{ name: 'Local Narrator' }],
    publisher_name: config.publisher_name ?? 'Emulator Audio',
    runtime_length_min: config.runtime_length_min ?? 321,
    release_date: config.release_date ?? '2026-05-15',
    language: config.language ?? 'english',
    product_images: config.product_images ?? { '500': 'https://m.media-amazon.com/images/I/B0EMU00001.jpg' },
    rating: config.rating ?? { overall_distribution: { display_average_rating: '4.7', display_stars: 4.7, num_ratings: 42 } },
  };
}

function defaultState(config = {}) {
  const products = config.products ?? [
    product(),
    product({ asin: 'B0EMU00002', title: 'Catalog Fixture', authors: [{ name: 'Local Reader' }], runtime_length_min: 188 }),
  ];
  return {
    marketplace: config.marketplace ?? 'us',
    products,
    library: config.library ?? [
      {
        asin: products[0].asin,
        date_added: fixedNow,
        percent_complete: 0,
        is_finished: false,
        product: products[0],
      },
    ],
    wishlist: config.wishlist ?? [{ asin: products[1].asin, added_at: fixedNow, product: products[1] }],
    reviews: config.reviews ?? [
      {
        id: 'audible_review_seed',
        asin: products[0].asin,
        rating: 5,
        headline: 'Great local fixture',
        body: 'Stable Audible-shaped JSON for emulator tests.',
        created_at: fixedNow,
        customer_name: 'Local Listener',
      },
    ],
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);

function page(items, c) {
  const numResults = Math.max(1, Math.min(Number(c.req.query('num_results') ?? c.req.query('page_size') ?? 50), 100));
  const pageNumber = Math.max(1, Number(c.req.query('page') ?? 1) || 1);
  const start = (pageNumber - 1) * numResults;
  return {
    start_index: start,
    num_results: Math.min(numResults, Math.max(items.length - start, 0)),
    total_results: items.length,
    next_page: start + numResults < items.length ? pageNumber + 1 : null,
    items: items.slice(start, start + numResults),
  };
}

function validationError(c, message) {
  return c.json({ message: `1 validation error detected: ${message}` }, 400);
}

function byAsin(s, asin) {
  return s.products.find((item) => item.asin === asin);
}

export function seedFromConfig(store, _baseUrl = 'https://api.audible.com', config = {}) {
  return save(store, defaultState(config));
}

export const contract = {
  provider: 'audible',
  source: 'Unofficial Audible mobile API shape documented by the audible Python SDK',
  docs: 'https://audible.readthedocs.io/en/latest/misc/external_api.html',
  baseUrl: 'https://api.audible.com',
  scope: ['catalog-products', 'product-detail', 'product-reviews', 'library', 'wishlist'],
  fidelity: 'stateful-json-rest-emulator',
};

export const plugin = {
  name: 'audible',
  register(app, store) {
    app.get('/1.0/catalog/products', (c) => {
      const q = String(c.req.query('keywords') ?? c.req.query('title') ?? '').toLowerCase();
      const products = state(store).products.filter((item) => !q || item.title.toLowerCase().includes(q) || item.authors.some((author) => author.name.toLowerCase().includes(q)));
      return c.json({ products: page(products, c) });
    });

    app.get('/1.0/catalog/products/:asin', (c) => {
      const item = byAsin(state(store), c.req.param('asin'));
      return item ? c.json({ product: item }) : routeError(c, 'Product not found', 404, 'not_found');
    });

    app.get('/1.0/catalog/products/:asin/reviews', (c) => {
      const asin = c.req.param('asin');
      if (!byAsin(state(store), asin)) return routeError(c, 'Product not found', 404, 'not_found');
      return c.json({ reviews: page(state(store).reviews.filter((review) => review.asin === asin), c) });
    });

    app.get('/1.0/library', (c) => c.json({ items: page(state(store).library, c) }));
    app.get('/1.0/library/:asin', (c) => {
      const item = state(store).library.find((entry) => entry.asin === c.req.param('asin'));
      return item ? c.json({ item }) : routeError(c, 'Library item not found', 404, 'not_found');
    });

    app.get('/1.0/wishlist', (c) => c.json({ items: page(state(store).wishlist, c) }));
    app.post('/1.0/wishlist', async (c) => {
      const s = state(store);
      const body = await readBody(c);
      const asin = body.asin ?? body.product_id;
      if (!asin) return validationError(c, "Value null at 'asin' failed to satisfy constraint: Member must not be null");
      const item = byAsin(s, asin);
      if (!item) return routeError(c, 'Product not found', 404, 'not_found');
      if (!s.wishlist.some((entry) => entry.asin === asin)) s.wishlist.push({ asin, added_at: fixedNow, product: item });
      save(store, s);
      return c.json({ asin, status: 'ADDED' }, 201);
    });
    app.delete('/1.0/wishlist/:asin', (c) => {
      const s = state(store);
      s.wishlist = s.wishlist.filter((item) => item.asin !== c.req.param('asin'));
      save(store, s);
      return c.body?.(null, 204) ?? c.json({}, 204);
    });

    app.get('/audible/inspect/state', (c) => c.json(state(store)));
  },
  seed(store, baseUrl, config = {}) {
    seedFromConfig(store, baseUrl, config);
  },
};

export const label = 'Audible API emulator';
export const endpoints = 'catalog products, product reviews, library, wishlist';
export const initConfig = { audible: { accessToken: 'audible_emulator_token', marketplace: 'us' } };

export default plugin;
