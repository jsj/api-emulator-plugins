function now() {
  return new Date().toISOString();
}

function artwork(id, size = 600) {
  return `https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/${id}/${size}x${size}bb.jpg`;
}

function initialState(config = {}) {
  const shows = config.shows ?? [
    { id: '1700000001', type: 'podcasts', attributes: { name: 'Emulator Daily', artistName: 'Apple Podcasts Emulator', feedUrl: 'https://podcasts.local/emulator-daily.xml', artworkUrl600: artwork('emulator-daily'), genreNames: ['Technology'], episodeCount: 2, releaseDate: '2026-05-15T09:00:00Z' } },
    { id: '1700000002', type: 'podcasts', attributes: { name: 'Localhost Radio', artistName: 'API Fixtures', feedUrl: 'https://podcasts.local/localhost-radio.xml', artworkUrl600: artwork('localhost-radio'), genreNames: ['Music'], episodeCount: 1, releaseDate: '2026-05-14T09:00:00Z' } },
  ];
  const episodes = config.episodes ?? [
    { id: '1800000001', type: 'podcast-episodes', showId: '1700000001', attributes: { name: 'The Mock Launch', description: 'A deterministic podcast episode fixture.', durationInMilliseconds: 1840000, releaseDateTime: '2026-05-15T09:00:00Z', episodeUrl: 'https://podcasts.local/audio/mock-launch.mp3' } },
    { id: '1800000002', type: 'podcast-episodes', showId: '1700000001', attributes: { name: 'Search API Stories', description: 'Testing Apple Podcasts search and lookup flows.', durationInMilliseconds: 1620000, releaseDateTime: '2026-05-14T09:00:00Z', episodeUrl: 'https://podcasts.local/audio/search-api.mp3' } },
  ];
  return {
    profile: config.profile ?? { id: 'apple_podcast_user_seed', storeFront: '143441-1,29', explicitContentAllowed: true },
    shows,
    episodes,
    subscriptions: config.subscriptions ?? ['1700000001'],
  };
}

function state(store) {
  const current = store.getData?.('apple-podcasts:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('apple-podcasts:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('apple-podcasts:state', next);
}

function hit(store, surface) {
  const hits = store.getData?.('apple-podcasts:hits') ?? [];
  hits.push({ surface, at: now() });
  store.setData?.('apple-podcasts:hits', hits);
}

function document(data, extra = {}) {
  return { data, ...extra };
}

function showMatches(show, term) {
  const lower = String(term ?? '').toLowerCase();
  return !lower || show.attributes.name.toLowerCase().includes(lower) || show.attributes.artistName.toLowerCase().includes(lower);
}

function itunesShow(show) {
  return {
    wrapperType: 'track',
    kind: 'podcast',
    collectionId: Number(show.id),
    trackId: Number(show.id),
    collectionName: show.attributes.name,
    trackName: show.attributes.name,
    artistName: show.attributes.artistName,
    feedUrl: show.attributes.feedUrl,
    artworkUrl600: show.attributes.artworkUrl600,
    primaryGenreName: show.attributes.genreNames[0],
    trackCount: show.attributes.episodeCount,
    releaseDate: show.attributes.releaseDate,
  };
}

function itunesEpisode(episode, show) {
  return {
    wrapperType: 'podcastEpisode',
    kind: 'podcast-episode',
    collectionId: Number(show.id),
    trackId: Number(episode.id),
    collectionName: show.attributes.name,
    trackName: episode.attributes.name,
    description: episode.attributes.description,
    episodeUrl: episode.attributes.episodeUrl,
    trackTimeMillis: episode.attributes.durationInMilliseconds,
    releaseDate: episode.attributes.releaseDateTime,
  };
}

export const contract = {
  provider: 'apple-podcasts',
  source: 'Apple iTunes Search API podcast search/lookup plus Podcasts-style library subset',
  docs: 'https://performance-partners.apple.com/search-api',
  scope: ['itunes-search', 'itunes-lookup', 'catalog-podcasts', 'episodes', 'subscriptions'],
  fidelity: 'stateful-json-api-emulator',
};

export const plugin = {
  name: 'apple-podcasts',
  register(app, store) {
    app.get('/search', (c) => {
      hit(store, 'itunes.search');
      const s = state(store);
      const results = s.shows.filter((show) => showMatches(show, c.req.query('term'))).map(itunesShow);
      return c.json({ resultCount: results.length, results });
    });

    app.get('/lookup', (c) => {
      hit(store, 'itunes.lookup');
      const s = state(store);
      const id = c.req.query('id');
      const show = s.shows.find((item) => item.id === id);
      if (!show) return c.json({ resultCount: 0, results: [] });
      const includeEpisodes = c.req.query('entity') === 'podcastEpisode';
      const results = [itunesShow(show)];
      if (includeEpisodes) results.push(...s.episodes.filter((episode) => episode.showId === show.id).map((episode) => itunesEpisode(episode, show)));
      return c.json({ resultCount: results.length, results });
    });

    app.get('/v1/me', (c) => c.json(state(store).profile));

    app.get('/v1/catalog/:storefront/podcasts', (c) => {
      const s = state(store);
      return c.json(document(s.shows.filter((show) => showMatches(show, c.req.query('term')))));
    });

    app.get('/v1/catalog/:storefront/podcasts/:id', (c) => {
      const show = state(store).shows.find((item) => item.id === c.req.param('id'));
      return show ? c.json(document([show])) : c.json({ errors: [{ status: '404', title: 'Not Found' }] }, 404);
    });

    app.get('/v1/catalog/:storefront/podcasts/:id/episodes', (c) => {
      const s = state(store);
      const show = s.shows.find((item) => item.id === c.req.param('id'));
      if (!show) return c.json({ errors: [{ status: '404', title: 'Not Found' }] }, 404);
      return c.json(document(s.episodes.filter((episode) => episode.showId === show.id)));
    });

    app.get('/v1/me/library/podcasts', (c) => {
      const s = state(store);
      return c.json(document(s.shows.filter((show) => s.subscriptions.includes(show.id))));
    });

    app.put('/v1/me/library/podcasts/:id', (c) => {
      const s = state(store);
      if (!s.shows.some((show) => show.id === c.req.param('id'))) return c.json({ errors: [{ status: '404', title: 'Not Found' }] }, 404);
      if (!s.subscriptions.includes(c.req.param('id'))) s.subscriptions.push(c.req.param('id'));
      saveState(store, s);
      return c.json(document([{ id: c.req.param('id'), type: 'library-podcasts' }]));
    });

    app.delete('/v1/me/library/podcasts/:id', (c) => {
      const s = state(store);
      s.subscriptions = s.subscriptions.filter((id) => id !== c.req.param('id'));
      saveState(store, s);
      return c.body?.(null, 204) ?? c.json({}, 204);
    });

    app.get('/inspect/state', (c) => c.json(state(store)));
  },
  seed(store, _baseUrl, config = {}) {
    saveState(store, initialState(config));
  },
};

export function seedFromConfig(store, baseUrl, config = {}) {
  plugin.seed(store, baseUrl, config);
}

export const label = 'Apple Podcasts API emulator';
export const endpoints = 'iTunes podcast search/lookup, podcast catalog, episodes, library subscriptions';
export const capabilities = contract.scope;
export const initConfig = { applePodcasts: { ...initialState(), bearerToken: 'apple_podcasts_emulator_token' } };
export default plugin;
