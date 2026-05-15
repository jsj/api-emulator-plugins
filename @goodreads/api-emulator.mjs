import { fixedNow, getState, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'goodreads:state';

function defaultState(config = {}) {
  return {
    books: config.books ?? [
      {
        id: '1',
        title: 'Localhost Library',
        isbn: '0000000001',
        isbn13: '9780000000001',
        publication_year: '2026',
        average_rating: '4.21',
        ratings_count: '321',
        description: 'A deterministic Goodreads API emulator fixture.',
        image_url: 'https://images.gr-assets.com/books/0000000001m/1.jpg',
        author: { id: '10', name: 'API Emulator' },
      },
      {
        id: '2',
        title: 'Social Reading Fixtures',
        isbn: '0000000002',
        isbn13: '9780000000002',
        publication_year: '2025',
        average_rating: '4.08',
        ratings_count: '144',
        description: 'Historical XML responses for local tests.',
        image_url: 'https://images.gr-assets.com/books/0000000002m/2.jpg',
        author: { id: '11', name: 'Local Reader' },
      },
    ],
    reviews: config.reviews ?? [
      {
        id: '100',
        book_id: '1',
        user_id: '42',
        rating: '5',
        body: 'Useful for smoke tests.',
        read_at: fixedNow,
      },
    ],
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function bookXml(book) {
  return `<book><id>${book.id}</id><title>${escapeXml(book.title)}</title><isbn>${book.isbn}</isbn><isbn13>${book.isbn13}</isbn13><publication_year>${book.publication_year}</publication_year><average_rating>${book.average_rating}</average_rating><ratings_count>${book.ratings_count}</ratings_count><description>${escapeXml(book.description)}</description><image_url>${escapeXml(book.image_url)}</image_url><authors><author><id>${book.author.id}</id><name>${escapeXml(book.author.name)}</name></author></authors></book>`;
}

function responseXml(body) {
  return `<?xml version="1.0" encoding="UTF-8"?><GoodreadsResponse><Request><authentication>true</authentication><key><![CDATA[goodreads_emulator_key]]></key><method><![CDATA[api_emulator]]></method></Request>${body}</GoodreadsResponse>`;
}

function sendXml(c, body, status = 200) {
  const headers = { 'content-type': 'application/xml; charset=utf-8' };
  if (c.text) return c.text(responseXml(body), status, headers);
  return c.body(responseXml(body), status, headers);
}

function requireKey(c) {
  const key = c.req.query('key') ?? c.req.query('api_key');
  return Boolean(key);
}

function page(items, c) {
  const perPage = Math.max(1, Math.min(Number(c.req.query('per_page') ?? 20), 200));
  const pageNumber = Math.max(1, Number(c.req.query('page') ?? 1) || 1);
  const start = (pageNumber - 1) * perPage;
  return { items: items.slice(start, start + perPage), start: start + 1, end: Math.min(start + perPage, items.length), total: items.length };
}

export function seedFromConfig(store, _baseUrl = 'https://www.goodreads.com', config = {}) {
  return save(store, defaultState(config));
}

export const contract = {
  provider: 'goodreads',
  source: 'Historical Goodreads developer API XML subset',
  docs: 'https://www.goodreads.com/api',
  baseUrl: 'https://www.goodreads.com',
  scope: ['book-search', 'book-show', 'author-show', 'review-list'],
  fidelity: 'historical-xml-rest-emulator',
};

export const plugin = {
  name: 'goodreads',
  register(app, store) {
    app.get('/search/index.xml', (c) => {
      if (!requireKey(c)) return sendXml(c, '<error>Developer key required.</error>', 401);
      const q = String(c.req.query('q') ?? '').toLowerCase();
      const matches = state(store).books.filter((book) => !q || book.title.toLowerCase().includes(q) || book.author.name.toLowerCase().includes(q));
      const { items, start, end, total } = page(matches, c);
      return sendXml(c, `<search><query>${escapeXml(c.req.query('q') ?? '')}</query><results-start>${total ? start : 0}</results-start><results-end>${end}</results-end><total-results>${total}</total-results><source>Goodreads API Emulator</source><results>${items.map((book) => `<work><id>${book.id}</id><books_count>1</books_count><ratings_count>${book.ratings_count}</ratings_count><text_reviews_count>12</text_reviews_count><original_publication_year>${book.publication_year}</original_publication_year><average_rating>${book.average_rating}</average_rating><best_book><id>${book.id}</id><title>${escapeXml(book.title)}</title><author><id>${book.author.id}</id><name>${escapeXml(book.author.name)}</name></author><image_url>${escapeXml(book.image_url)}</image_url></best_book></work>`).join('')}</results></search>`);
    });

    app.get('/book/show/:id.xml', (c) => {
      if (!requireKey(c)) return sendXml(c, '<error>Developer key required.</error>', 401);
      const book = state(store).books.find((item) => item.id === c.req.param('id'));
      return book ? sendXml(c, bookXml(book)) : sendXml(c, '<error>Book not found.</error>', 404);
    });

    app.get('/author/show/:id.xml', (c) => {
      if (!requireKey(c)) return sendXml(c, '<error>Developer key required.</error>', 401);
      const books = state(store).books.filter((book) => book.author.id === c.req.param('id'));
      if (!books.length) return sendXml(c, '<error>Author not found.</error>', 404);
      const author = books[0].author;
      return sendXml(c, `<author><id>${author.id}</id><name>${escapeXml(author.name)}</name><books>${books.map(bookXml).join('')}</books></author>`);
    });

    app.get('/review/list/:userId.xml', (c) => {
      const reviews = state(store).reviews.filter((review) => review.user_id === c.req.param('userId'));
      return sendXml(c, `<reviews start="1" end="${reviews.length}" total="${reviews.length}">${reviews.map((review) => {
        const book = state(store).books.find((item) => item.id === review.book_id);
        return `<review><id>${review.id}</id><rating>${review.rating}</rating><body>${escapeXml(review.body)}</body><read_at>${review.read_at}</read_at>${book ? bookXml(book) : ''}</review>`;
      }).join('')}</reviews>`);
    });

    app.get('/goodreads/inspect/state', (c) => c.json(state(store)));
    app.get('/api', (c) => routeError(c, 'Goodreads historical XML API emulator exposes /search/index.xml, /book/show/:id.xml, /author/show/:id.xml, and /review/list/:userId.xml', 404, 'not_found'));
  },
  seed(store, baseUrl, config = {}) {
    seedFromConfig(store, baseUrl, config);
  },
};

export const label = 'Goodreads API emulator';
export const endpoints = 'historical XML book search, book detail, author detail, review list';
export const initConfig = { goodreads: { key: 'goodreads_emulator_key', secret: 'goodreads_emulator_secret' } };

export default plugin;
