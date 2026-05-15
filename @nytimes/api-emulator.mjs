import { fixedNow, getState, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'nytimes:state';

function defaultState() {
  return {
    articles: [
      {
        web_url: 'https://www.nytimes.com/2026/01/01/technology/emulator-api.html',
        snippet: 'A deterministic New York Times API emulator story.',
        lead_paragraph: 'The emulator returns stable Article Search payloads.',
        abstract: 'Stable Article Search payloads for local development.',
        source: 'The New York Times',
        pub_date: fixedNow,
        document_type: 'article',
        news_desk: 'Technology',
        section_name: 'Technology',
        type_of_material: 'News',
        _id: 'nyt://article/emulator-article-1',
        headline: { main: 'API Emulator Makes Local Testing Predictable' },
        byline: { original: 'By API Emulator' },
        keywords: [{ name: 'subject', value: 'APIs', rank: 1 }],
      },
    ],
    topStories: [{ section: 'technology', title: 'API Emulator Makes Local Testing Predictable', url: 'https://www.nytimes.com/2026/01/01/technology/emulator-api.html', created_date: fixedNow }],
  };
}

const state = (store) => getState(store, STATE_KEY, defaultState);

export function seedFromConfig(store, baseUrl = 'https://api.nytimes.com', config = {}) {
  return setState(store, STATE_KEY, { ...defaultState(), baseUrl, ...config });
}

export const contract = {
  provider: 'nytimes',
  source: 'NYTimes public_api_specs OpenAPI subset',
  docs: 'https://developer.nytimes.com/apis',
  baseUrl: 'https://api.nytimes.com',
  scope: ['article_search', 'archive', 'top_stories'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'nytimes',
  register(app, store) {
    app.get('/svc/search/v2/articlesearch.json', (c) => {
      const q = c.req.query('q')?.toLowerCase();
      const articles = state(store).articles.filter((article) => !q || article.headline.main.toLowerCase().includes(q) || article.snippet.toLowerCase().includes(q));
      return c.json({ status: 'OK', copyright: 'Copyright (c) 2026 The New York Times Company. All Rights Reserved.', response: { docs: articles, meta: { hits: articles.length, offset: 0, time: 1 } } });
    });
    app.get('/svc/archive/v1/:year/:month.json', (c) => {
      const docs = state(store).articles.map((article) => ({ ...article, uri: article._id }));
      return c.json({ status: 'OK', copyright: 'Copyright (c) 2026 The New York Times Company. All Rights Reserved.', response: { docs, meta: { hits: docs.length } } });
    });
    app.get('/svc/topstories/v2/:section{.+}', (c) => {
      const section = c.req.param('section').replace(/\.json$/, '');
      const stories = state(store).topStories.filter((story) => section === 'home' || story.section === section);
      return c.json({ status: 'OK', section, num_results: stories.length, results: stories });
    });
    app.get('/svc/books/v3/lists/current/:list.json', (c) => routeError(c, `List ${c.req.param('list')} is not seeded`, 404, 'not_found'));
    app.get('/nytimes/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'New York Times API emulator';
export const endpoints = 'article search, archive, top stories';
export const initConfig = { nytimes: { apiKey: 'nyt-emulator-key' } };

export default plugin;
