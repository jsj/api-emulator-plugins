const NOW = '2026-01-20T12:00:00Z';

function slug(title) {
  return String(title ?? '').trim().replaceAll(' ', '_');
}

function normalizeTitle(title) {
  return String(title ?? '').replaceAll('_', ' ').trim();
}

function pageUrl(site, title) {
  return `${site.articleUrlBase}/${encodeURIComponent(slug(title))}`;
}

function stripWikiText(text) {
  return String(text ?? '')
    .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, '$2')
    .replace(/'''?/g, '')
    .replace(/==+/g, '')
    .replace(/\{\{[^}]+\}\}/g, '')
    .trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function initialState(config = {}) {
  const wikipedia = {
    key: 'wikipedia',
    rank: 1,
    name: 'Wikipedia',
    baseUrl: 'https://en.wikipedia.org/w/api.php',
    articleUrlBase: 'https://en.wikipedia.org/wiki',
    mainpage: 'Main Page',
    generator: 'MediaWiki 1.43.0-wmf.1',
    sitename: 'Wikipedia',
    statistics: { pages: 62200000, articles: 6940000, edits: 1230000000, images: 980000, users: 49000000, activeusers: 123000, admins: 850 },
  };
  const commons = {
    key: 'commons',
    rank: 2,
    name: 'Wikimedia Commons',
    baseUrl: 'https://commons.wikimedia.org/w/api.php',
    articleUrlBase: 'https://commons.wikimedia.org/wiki',
    mainpage: 'Main Page',
    generator: 'MediaWiki 1.43.0-wmf.1',
    sitename: 'Wikimedia Commons',
    statistics: { pages: 115000000, articles: 106000000, edits: 890000000, images: 112000000, users: 13000000, activeusers: 33000, admins: 180 },
  };
  const wiktionary = {
    key: 'wiktionary',
    rank: 3,
    name: 'Wiktionary',
    baseUrl: 'https://en.wiktionary.org/w/api.php',
    articleUrlBase: 'https://en.wiktionary.org/wiki',
    mainpage: 'Main Page',
    generator: 'MediaWiki 1.43.0-wmf.1',
    sitename: 'Wiktionary',
    statistics: { pages: 8600000, articles: 8200000, edits: 76000000, images: 3800, users: 8100000, activeusers: 5400, admins: 90 },
  };
  const wikidata = {
    key: 'wikidata',
    rank: 4,
    name: 'Wikidata',
    baseUrl: 'https://www.wikidata.org/w/api.php',
    articleUrlBase: 'https://www.wikidata.org/wiki',
    mainpage: 'Wikidata:Main Page',
    generator: 'MediaWiki 1.43.0-wmf.1',
    sitename: 'Wikidata',
    statistics: { pages: 121000000, articles: 116000000, edits: 2300000000, images: 0, users: 15000000, activeusers: 26000, admins: 70 },
  };
  const wookieepedia = {
    key: 'wookieepedia',
    rank: 5,
    name: 'Wookieepedia',
    baseUrl: 'https://starwars.fandom.com/api.php',
    articleUrlBase: 'https://starwars.fandom.com/wiki',
    mainpage: 'Wookieepedia',
    generator: 'MediaWiki 1.39.0-fandom',
    sitename: 'Wookieepedia',
    statistics: { pages: 1400000, articles: 190000, edits: 7200000, images: 160000, users: 1200000, activeusers: 2300, admins: 40 },
  };
  const sites = [wikipedia, commons, wiktionary, wikidata, wookieepedia];
  const pages = [
    {
      pageid: 736,
      ns: 0,
      title: 'Wikipedia',
      site: 'wikipedia',
      touched: NOW,
      revid: 10001,
      size: 9024,
      wordcount: 900,
      wikitext: "'''Wikipedia''' is a free online encyclopedia written and maintained by a community of volunteers.",
    },
    {
      pageid: 12345,
      ns: 0,
      title: 'MediaWiki',
      site: 'wikipedia',
      touched: NOW,
      revid: 10002,
      size: 6420,
      wordcount: 680,
      wikitext: "'''MediaWiki''' is free and open-source wiki software used by Wikipedia, Wikimedia Commons, Wiktionary, Wikidata, and Fandom.",
    },
    {
      pageid: 31415,
      ns: 0,
      title: 'Wikimedia Commons',
      site: 'commons',
      touched: NOW,
      revid: 10003,
      size: 5200,
      wordcount: 510,
      wikitext: "'''Wikimedia Commons''' is a repository of free-use images, sounds, videos, and other media.",
    },
    {
      pageid: 27182,
      ns: 0,
      title: 'Wiktionary',
      site: 'wiktionary',
      touched: NOW,
      revid: 10004,
      size: 4100,
      wordcount: 430,
      wikitext: "'''Wiktionary''' is a multilingual, web-based project to create a free content dictionary.",
    },
    {
      pageid: 42,
      ns: 0,
      title: 'Q42',
      site: 'wikidata',
      touched: NOW,
      revid: 10005,
      size: 2048,
      wordcount: 220,
      wikitext: "'''Q42''' is the Wikidata item for Douglas Adams, author of The Hitchhiker's Guide to the Galaxy.",
    },
    {
      pageid: 1138,
      ns: 0,
      title: 'Luke Skywalker',
      site: 'wookieepedia',
      touched: NOW,
      revid: 10006,
      size: 7600,
      wordcount: 740,
      wikitext: "'''Luke Skywalker''' was a legendary Jedi Master who helped defeat the Galactic Empire.",
    },
    {
      pageid: 1977,
      ns: 0,
      title: 'Wookieepedia',
      site: 'wookieepedia',
      touched: NOW,
      revid: 10007,
      size: 3600,
      wordcount: 380,
      wikitext: "'''Wookieepedia''' is a Star Wars wiki hosted by Fandom.",
    },
  ];
  return { sites, pages, requests: [], ...config };
}

function state(store) {
  const current = store.getData?.('mediawiki:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('mediawiki:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('mediawiki:state', next);
}

function selectedSite(s, c) {
  const requested = c.req.query('site') ?? c.req.header('x-mediawiki-site') ?? 'wikipedia';
  return s.sites.find((site) => site.key === requested || site.sitename.toLowerCase() === requested.toLowerCase()) ?? s.sites[0];
}

function sitePages(s, site) {
  return s.pages.filter((page) => page.site === site.key);
}

function findPage(s, site, title) {
  const normalized = normalizeTitle(title).toLowerCase();
  return sitePages(s, site).find((page) => normalizeTitle(page.title).toLowerCase() === normalized);
}

function searchPages(s, site, query) {
  const needle = normalizeTitle(query).toLowerCase();
  return sitePages(s, site).filter((page) => [page.title, page.wikitext].join(' ').toLowerCase().includes(needle));
}

function pageInfo(site, page, includeMissing = false) {
  if (!page && includeMissing) return { ns: 0, title: includeMissing, missing: '' };
  return {
    pageid: page.pageid,
    ns: page.ns,
    title: page.title,
    contentmodel: 'wikitext',
    pagelanguage: 'en',
    touched: page.touched,
    lastrevid: page.revid,
    length: page.size,
    fullurl: pageUrl(site, page.title),
    editurl: `${pageUrl(site, page.title)}?action=edit`,
  };
}

function pagePayload(site, page, props) {
  const output = pageInfo(site, page);
  if (props.has('extracts')) output.extract = stripWikiText(page.wikitext);
  if (props.has('revisions')) {
    output.revisions = [{
      revid: page.revid,
      parentid: page.revid - 1,
      user: 'EmulatorBot',
      timestamp: page.touched,
      slots: { main: { contentmodel: 'wikitext', contentformat: 'text/x-wiki', '*': page.wikitext } },
      '*': page.wikitext,
    }];
  }
  return output;
}

function htmlFor(page) {
  const text = stripWikiText(page.wikitext);
  return `<div class="mw-parser-output"><p>${text}</p></div>`;
}

function queryResponse(s, site, c) {
  const list = c.req.query('list');
  const meta = c.req.query('meta');
  const props = new Set(String(c.req.query('prop') ?? 'info').split('|').filter(Boolean));
  if (list === 'search') {
    const srsearch = c.req.query('srsearch') ?? '';
    const sroffset = Number(c.req.query('sroffset') ?? 0);
    const srlimit = Math.min(Number(c.req.query('srlimit') ?? 10), 50);
    const matches = searchPages(s, site, srsearch);
    const search = matches.slice(sroffset, sroffset + srlimit).map((page) => ({
      ns: page.ns,
      title: page.title,
      pageid: page.pageid,
      size: page.size,
      wordcount: page.wordcount,
      snippet: srsearch
        ? stripWikiText(page.wikitext).replace(new RegExp(escapeRegExp(srsearch), 'ig'), (match) => `<span class="searchmatch">${match}</span>`)
        : stripWikiText(page.wikitext),
      timestamp: page.touched,
    }));
    const body = { batchcomplete: '', query: { searchinfo: { totalhits: matches.length }, search } };
    if (sroffset + srlimit < matches.length) body.continue = { sroffset: sroffset + srlimit, continue: '-||' };
    return body;
  }
  const query = {};
  if (meta === 'siteinfo') {
    const siprop = new Set(String(c.req.query('siprop') ?? 'general|statistics').split('|'));
    if (siprop.has('general')) {
      query.general = {
        mainpage: site.mainpage,
        base: pageUrl(site, site.mainpage),
        sitename: site.sitename,
        generator: site.generator,
        case: 'first-letter',
        lang: 'en',
        articlepath: '/wiki/$1',
        scriptpath: site.baseUrl.endsWith('/w/api.php') ? '/w' : '',
        server: site.articleUrlBase.replace(/\/wiki$/, ''),
        wikiid: `${site.key}wiki`,
      };
    }
    if (siprop.has('statistics')) query.statistics = site.statistics;
  }
  if (props.size || c.req.query('titles')) {
    const titles = String(c.req.query('titles') ?? site.mainpage).split('|');
    const pages = {};
    for (const title of titles) {
      const page = findPage(s, site, title);
      if (!page) {
        pages[-1] = pageInfo(site, null, normalizeTitle(title));
        continue;
      }
      pages[page.pageid] = pagePayload(site, page, props);
    }
    query.pages = pages;
  }
  return { batchcomplete: '', query };
}

function handleApi(c, store) {
  const s = state(store);
  const site = selectedSite(s, c);
  const action = c.req.query('action') ?? 'query';
  s.requests.push({ action, site: site.key, at: NOW });
  saveState(store, s);

  if (action === 'query') return c.json(queryResponse(s, site, c));
  if (action === 'parse') {
    const title = c.req.query('page') ?? c.req.query('title') ?? site.mainpage;
    const page = findPage(s, site, title);
    if (!page) return c.json({ error: { code: 'missingtitle', info: 'The page you specified does not exist.' }, servedby: 'api-emulator' }, 404);
    return c.json({
      parse: {
        title: page.title,
        pageid: page.pageid,
        revid: page.revid,
        text: { '*': htmlFor(page) },
        langlinks: [],
        categories: [],
        links: [],
        sections: [],
      },
    });
  }
  if (action === 'opensearch') {
    const search = c.req.query('search') ?? '';
    const matches = searchPages(s, site, search).slice(0, Number(c.req.query('limit') ?? 10));
    return c.json([search, matches.map((page) => page.title), matches.map((page) => stripWikiText(page.wikitext)), matches.map((page) => pageUrl(site, page.title))]);
  }
  if (action === 'help') return c.json({ main: 'MediaWiki API help emulator', modules: ['query', 'parse', 'opensearch'] });
  return c.json({ error: { code: 'unknown_action', info: `Unrecognized value for parameter "action": ${action}` }, servedby: 'api-emulator' }, 400);
}

function handleSummary(c, store) {
  const s = state(store);
  const site = selectedSite(s, c);
  const title = normalizeTitle(c.req.param('title'));
  const page = findPage(s, site, title);
  if (!page) return c.json({ type: 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found', title: 'Not found' }, 404);
  return c.json({
    type: 'standard',
    title: page.title,
    displaytitle: page.title,
    pageid: page.pageid,
    extract: stripWikiText(page.wikitext),
    content_urls: { desktop: { page: pageUrl(site, page.title) }, mobile: { page: pageUrl(site, page.title) } },
    timestamp: page.touched,
  });
}

export const contract = {
  provider: 'mediawiki',
  source: 'MediaWiki Action API compatible subset',
  docs: 'https://www.mediawiki.org/wiki/API:Action_API',
  baseUrl: 'https://en.wikipedia.org/w/api.php',
  scope: ['action=query', 'list=search', 'meta=siteinfo', 'prop=info|extracts|revisions', 'action=parse', 'action=opensearch', 'REST page summary'],
  fidelity: 'deterministic-mediawiki-json',
  compatibilityOracle: 'official MediaWiki Action API docs and Wikimedia REST page summary shape',
};

export const plugin = {
  name: 'mediawiki',
  register(app, store) {
    app.get('/api.php', (c) => handleApi(c, store));
    app.post('/api.php', (c) => handleApi(c, store));
    app.get('/w/api.php', (c) => handleApi(c, store));
    app.post('/w/api.php', (c) => handleApi(c, store));
    app.get('/api/rest_v1/page/summary/:title', (c) => handleSummary(c, store));
    app.get('/w/rest.php/v1/page/:title/summary', (c) => handleSummary(c, store));
    app.get('/mediawiki/inspect/contract', (c) => c.json(contract));
    app.get('/mediawiki/inspect/state', (c) => c.json(state(store)));
    app.get('/mediawiki/inspect/popular', (c) => c.json(state(store).sites.toSorted((a, b) => a.rank - b.rank)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'MediaWiki API emulator';
export const endpoints = 'Action API query, parse, opensearch, siteinfo, and page summaries';
export const capabilities = contract.scope;
export const initConfig = { mediawiki: initialState() };

export default plugin;
