function now() {
  return new Date().toISOString();
}

function artwork(id) {
  return { url: `https://is1-ssl.mzstatic.com/image/thumb/Shazam116/v4/${id}/{w}x{h}bb.jpg`, width: 1200, height: 1200 };
}

function initialState(config = {}) {
  const songs = config.songs ?? [
    { id: 'shazam_song_seed', type: 'songs', attributes: { title: 'Recognize This Mock', artistName: 'Shazam Emulator', albumName: 'Recognition Fixtures', isrc: 'EMUSHAZAM001', shazamCount: 42000, genres: ['Pop'], artwork: artwork('recognize-this'), previews: [{ url: 'https://audio-ssl.itunes.apple.com/shazam/recognize-this.m4a' }] } },
    { id: 'shazam_song_two', type: 'songs', attributes: { title: 'Spectrogram Smoke', artistName: 'Localhost Artist', albumName: 'Recognition Fixtures', isrc: 'EMUSHAZAM002', shazamCount: 17000, genres: ['Electronic'], artwork: artwork('spectrogram-smoke'), previews: [{ url: 'https://audio-ssl.itunes.apple.com/shazam/spectrogram-smoke.m4a' }] } },
  ];
  return {
    songs,
    charts: config.charts ?? { us: ['shazam_song_seed', 'shazam_song_two'], global: ['shazam_song_seed', 'shazam_song_two'] },
    matches: config.matches ?? [{ id: 'match_seed', signature: 'emulator-audio-signature', songId: 'shazam_song_seed', matchedAt: '2026-05-15T12:00:00.000Z' }],
    nextMatchId: 2,
  };
}

function state(store) {
  const current = store.getData?.('shazam:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('shazam:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('shazam:state', next);
}

function hit(store, surface) {
  const hits = store.getData?.('shazam:hits') ?? [];
  hits.push({ surface, at: now() });
  store.setData?.('shazam:hits', hits);
}

function document(data, extra = {}) {
  return { data, ...extra };
}

function matchesTerm(song, term) {
  const lower = String(term ?? '').toLowerCase();
  return !lower || song.attributes.title.toLowerCase().includes(lower) || song.attributes.artistName.toLowerCase().includes(lower);
}

function songCard(song) {
  return {
    key: song.id,
    title: song.attributes.title,
    subtitle: song.attributes.artistName,
    images: { coverart: song.attributes.artwork.url.replace('{w}', '400').replace('{h}', '400') },
    hub: { type: 'APPLEMUSIC', actions: [{ type: 'uri', uri: `shazam://track/${song.id}` }] },
  };
}

export const contract = {
  provider: 'shazam',
  source: 'Apple ShazamKit-inspired recognition plus Shazam chart/search compatible JSON subset',
  docs: 'https://developer.apple.com/shazamkit/',
  scope: ['search', 'charts', 'song-detail', 'recognition-matches', 'apple-music-links'],
  fidelity: 'stateful-json-api-emulator',
};

export const plugin = {
  name: 'shazam',
  register(app, store) {
    app.get('/v1/search', (c) => {
      hit(store, 'search');
      const songs = state(store).songs.filter((song) => matchesTerm(song, c.req.query('term') ?? c.req.query('query')));
      return c.json({ tracks: { hits: songs.map((song) => ({ track: songCard(song) })) } });
    });

    app.get('/v1/charts/:storefront', (c) => {
      hit(store, 'charts');
      const s = state(store);
      const ids = s.charts[c.req.param('storefront')] ?? s.charts.global;
      return c.json(document(ids.map((id) => s.songs.find((song) => song.id === id)).filter(Boolean)));
    });

    app.get('/v1/catalog/:storefront/songs/:id', (c) => {
      const song = state(store).songs.find((item) => item.id === c.req.param('id'));
      return song ? c.json(document([song])) : c.json({ errors: [{ status: '404', title: 'Not Found' }] }, 404);
    });

    app.get('/v1/catalog/:storefront/songs/:id/shazam', (c) => {
      const song = state(store).songs.find((item) => item.id === c.req.param('id'));
      if (!song) return c.json({ errors: [{ status: '404', title: 'Not Found' }] }, 404);
      return c.json({ data: [{ id: song.id, type: 'shazam-songs', attributes: { title: song.attributes.title, artistName: song.attributes.artistName, shazamCount: song.attributes.shazamCount } }] });
    });

    app.post('/v1/matches', async (c) => {
      hit(store, 'matches.create');
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const signature = body.signature ?? body.audioSignature ?? 'emulator-audio-signature';
      const seeded = s.matches.find((match) => match.signature === signature);
      const song = s.songs.find((item) => item.id === (seeded?.songId ?? body.songId)) ?? s.songs[0];
      const match = { id: `match_${s.nextMatchId++}`, signature, songId: song.id, matchedAt: now() };
      s.matches.push(match);
      saveState(store, s);
      return c.json({ matches: [{ id: match.id, song, score: seeded ? 1 : 0.92 }] }, 201);
    });

    app.get('/v1/matches/:id', (c) => {
      const s = state(store);
      const match = s.matches.find((item) => item.id === c.req.param('id'));
      if (!match) return c.json({ errors: [{ status: '404', title: 'Not Found' }] }, 404);
      const song = s.songs.find((item) => item.id === match.songId);
      return c.json({ match, song });
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

export const label = 'Shazam API emulator';
export const endpoints = 'song search, charts, Shazam song metadata, recognition matches';
export const capabilities = contract.scope;
export const initConfig = { shazam: { ...initialState(), developerToken: 'shazam_emulator_token' } };
export default plugin;
