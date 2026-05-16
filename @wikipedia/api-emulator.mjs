import { fixedNow, getState, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'wikipedia:state';

function normalizeTitle(title = '') {
  return decodeURIComponent(title).replaceAll('_', ' ').trim();
}

function pageKey(title = '') {
  return normalizeTitle(title).replaceAll(' ', '_');
}

function defaultState() {
  return {
    pages: [
      {
        pageid: 1001,
        key: 'Ada_Lovelace',
        title: 'Ada Lovelace',
        description: 'English mathematician and writer',
        extract: 'Ada Lovelace was an English mathematician and writer, chiefly known for her work on Charles Babbage’s Analytical Engine.',
        source: 'Ada Lovelace was an English mathematician and writer. She is often regarded as an early computer programmer.',
        thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Ada_Lovelace_portrait.jpg/320px-Ada_Lovelace_portrait.jpg', width: 320, height: 405 },
      },
      {
        pageid: 1002,
        key: 'Alan_Turing',
        title: 'Alan Turing',
        description: 'British mathematician and computer scientist',
        extract: 'Alan Turing was a British mathematician, computer scientist, logician, cryptanalyst, philosopher, and theoretical biologist.',
        source: 'Alan Turing made foundational contributions to theoretical computer science and artificial intelligence.',
        thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Alan_Turing_Aged_16.jpg/320px-Alan_Turing_Aged_16.jpg', width: 320, height: 418 },
      },
      {
        pageid: 1003,
        key: 'API_emulator',
        title: 'API emulator',
        description: 'Local deterministic service used for client testing',
        extract: 'An API emulator is a local service that imitates an external API for deterministic development and testing.',
        source: 'API emulators help developers test integrations without reaching production services.',
        thumbnail: null,
      },
    ],
    searches: [],
  };
}

const state = (store) => getState(store, STATE_KEY, defaultState);

function findPage(pages, title) {
  const key = pageKey(title).toLowerCase();
  return pages.find((page) => page.key.toLowerCase() === key || page.title.toLowerCase() === normalizeTitle(title).toLowerCase());
}

function summaryFor(page) {
  return {
    type: 'standard',
    title: page.title,
    displaytitle: page.title,
    namespace: { id: 0, text: '' },
    wikibase_item: `Q${page.pageid}`,
    titles: {
      canonical: page.key,
      normalized: page.title,
      display: page.title,
    },
    pageid: page.pageid,
    lang: 'en',
    dir: 'ltr',
    revision: `${page.pageid}01`,
    tid: `mw-${page.pageid}`,
    timestamp: fixedNow,
    description: page.description,
    description_source: 'local',
    content_urls: {
      desktop: { page: `https://en.wikipedia.org/wiki/${page.key}`, revisions: `https://en.wikipedia.org/wiki/${page.key}?action=history`, edit: `https://en.wikipedia.org/wiki/${page.key}?action=edit`, talk: `https://en.wikipedia.org/wiki/Talk:${page.key}` },
      mobile: { page: `https://en.m.wikipedia.org/wiki/${page.key}`, revisions: `https://en.m.wikipedia.org/wiki/Special:History/${page.key}`, edit: `https://en.m.wikipedia.org/wiki/${page.key}?action=edit`, talk: `https://en.m.wikipedia.org/wiki/Talk:${page.key}` },
    },
    extract: page.extract,
    extract_html: `<p>${page.extract}</p>`,
    ...(page.thumbnail ? { thumbnail: page.thumbnail, originalimage: page.thumbnail } : {}),
  };
}

function searchResult(page, query) {
  const escapedQuery = String(query ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const excerpt = escapedQuery ? page.extract.replace(new RegExp(escapedQuery, 'i'), (match) => `<span class="searchmatch">${match}</span>`) : page.extract;
  return {
    id: page.pageid,
    key: page.key,
    title: page.title,
    excerpt,
    matched_title: null,
    description: page.description,
    thumbnail: page.thumbnail,
  };
}

function matchingPages(pages, query) {
  const q = String(query ?? '').toLowerCase();
  if (!q) return pages;
  return pages.filter((page) => [page.title, page.key, page.description, page.extract].some((value) => value.toLowerCase().includes(q)));
}

function problem(c, status, title, detail) {
  return c.json({ type: 'https://www.mediawiki.org/wiki/HyperSwitch/errors/not_found', title, detail }, status, { 'content-type': 'application/problem+json' });
}

function pageObject(page, baseUrl = 'https://en.wikipedia.org') {
  return {
    id: page.pageid,
    key: page.key,
    title: page.title,
    latest: { id: Number(`${page.pageid}01`), timestamp: fixedNow },
    content_model: 'wikitext',
    license: { url: 'https://creativecommons.org/licenses/by-sa/4.0/', title: 'Creative Commons Attribution-Share Alike 4.0' },
    html_url: `${baseUrl}/w/rest.php/v1/page/${encodeURIComponent(page.key)}/html`,
  };
}

export function seedFromConfig(store, baseUrl = 'https://en.wikipedia.org', config = {}) {
  return setState(store, STATE_KEY, { ...defaultState(), baseUrl, ...config });
}

export const contract = {
  provider: 'wikipedia',
  source: 'Wikimedia REST API and MediaWiki Action API read subset',
  docs: 'https://www.mediawiki.org/wiki/Wikimedia_REST_API',
  baseUrl: 'https://en.wikipedia.org',
  scope: ['page_summary', 'rest_search', 'page_content', 'action_query_search'],
  fidelity: 'deterministic-read-subset',
  compatibilityOracle: 'MediaWiki REST examples and mwn Action API base URL override',
};

export const plugin = {
  name: 'wikipedia',
  register(app, store) {
    app.get('/api/rest_v1/page/summary/:title{.+}', (c) => {
      const page = findPage(state(store).pages, c.req.param('title'));
      if (!page) return problem(c, 404, 'Not found.', `The page you specified doesn't exist: ${normalizeTitle(c.req.param('title'))}`);
      return c.json(summaryFor(page));
    });

    app.get('/w/rest.php/v1/search/page', (c) => {
      const q = c.req.query('q');
      if (!q) return routeError(c, 'The q query parameter is required', 400, 'missing_param');
      const limit = Number(c.req.query('limit') ?? 50);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) return routeError(c, 'limit must be an integer between 1 and 100', 400, 'bad_limit');
      const s = state(store);
      s.searches.push({ type: 'page', q, limit });
      return c.json({ pages: matchingPages(s.pages, q).slice(0, limit).map((page) => searchResult(page, q)) });
    });

    app.get('/w/rest.php/v1/search/title', (c) => {
      const q = c.req.query('q');
      if (!q) return routeError(c, 'The q query parameter is required', 400, 'missing_param');
      const limit = Number(c.req.query('limit') ?? 50);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) return routeError(c, 'limit must be an integer between 1 and 100', 400, 'bad_limit');
      const s = state(store);
      s.searches.push({ type: 'title', q, limit });
      return c.json({ pages: matchingPages(s.pages, q).slice(0, limit).map((page) => searchResult(page, q)) });
    });

    app.get('/w/rest.php/v1/page/:title/bare', (c) => {
      const s = state(store);
      const page = findPage(s.pages, c.req.param('title'));
      if (!page) return problem(c, 404, 'Not found.', `The page you specified doesn't exist: ${normalizeTitle(c.req.param('title'))}`);
      return c.json(pageObject(page, s.baseUrl));
    });

    app.get('/w/rest.php/v1/page/:title/html', (c) => {
      const page = findPage(state(store).pages, c.req.param('title'));
      if (!page) return c.text('<!doctype html><title>Not found</title>', 404);
      return c.text(`<!doctype html><html><body><main id="content"><h1>${page.title}</h1><p>${page.extract}</p></main></body></html>`, 200, { 'content-type': 'text/html; charset=utf-8' });
    });

    app.get('/w/rest.php/v1/page/:title', (c) => {
      const page = findPage(state(store).pages, c.req.param('title'));
      if (!page) return problem(c, 404, 'Not found.', `The page you specified doesn't exist: ${normalizeTitle(c.req.param('title'))}`);
      return c.json({ ...pageObject(page, state(store).baseUrl), source: page.source });
    });

    app.get('/w/api.php', (c) => {
      const action = c.req.query('action') ?? 'query';
      const format = c.req.query('format') ?? 'json';
      if (format !== 'json') return c.json({ error: { code: 'badformat', info: 'Only format=json is supported by the emulator' } }, 400);
      if (action !== 'query') return c.json({ error: { code: 'badvalue', info: `Unrecognized value for parameter action: ${action}` } }, 400);
      const list = c.req.query('list');
      const prop = c.req.query('prop');
      const pages = state(store).pages;
      if (list === 'search') {
        const q = c.req.query('srsearch') ?? '';
        const limit = Math.min(Number(c.req.query('srlimit') ?? 10), 50);
        const results = matchingPages(pages, q).slice(0, limit).map((page, index) => ({
          ns: 0,
          title: page.title,
          pageid: page.pageid,
          size: page.source.length,
          wordcount: page.source.split(/\s+/).length,
          snippet: searchResult(page, q).excerpt,
          timestamp: fixedNow,
          index: index + 1,
        }));
        return c.json({ batchcomplete: '', query: { searchinfo: { totalhits: results.length }, search: results } });
      }
      if (prop === 'extracts') {
        const title = c.req.query('titles') ?? '';
        const page = findPage(pages, title);
        if (!page) return c.json({ batchcomplete: '', query: { pages: { '-1': { ns: 0, title: normalizeTitle(title), missing: '' } } } });
        return c.json({ batchcomplete: '', query: { pages: { [page.pageid]: { pageid: page.pageid, ns: 0, title: page.title, extract: page.extract } } } });
      }
      return c.json({ batchcomplete: '', query: { pages: {} } });
    });

    app.get('/wikipedia/inspect/state', (c) => c.json(state(store)));
    app.get('/wikipedia/inspect/contract', (c) => c.json(contract));
  },
};

export const label = 'Wikipedia API emulator';
export const endpoints = 'REST summaries, REST search, page content, Action API query search';
export const capabilities = contract.scope;
export const initConfig = { wikipedia: { userAgent: 'api-emulator/1.0' } };

export default plugin;
