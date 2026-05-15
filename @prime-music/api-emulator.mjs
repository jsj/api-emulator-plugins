function now() {
  return new Date().toISOString();
}

function image(id) {
  return { url: `https://m.media-amazon.com/images/I/${id}._SL500_.jpg`, height: 500, width: 500 };
}

function initialState(config = {}) {
  const artist = config.artist ?? { id: 'B000PRIMEARTIST', type: 'artist', name: 'Prime Emulator', href: '/v1/artists/B000PRIMEARTIST' };
  const album = config.album ?? { id: 'B000PRIMEALBUM', type: 'album', name: 'Prime Fixtures', artists: [artist], images: [image('prime-album')], releaseDate: '2026-05-15', totalTracks: 2 };
  const tracks = config.tracks ?? [
    { id: 'B000PRIMETRACK1', type: 'track', name: 'Included With Prime', artists: [artist], album, durationMs: 199000, isExplicit: false, isPrimeEligible: true, previewUrl: 'https://music.amazon.local/previews/prime-track-1.mp3' },
    { id: 'B000PRIMETRACK2', type: 'track', name: 'Alexa Play Localhost', artists: [artist], album, durationMs: 176000, isExplicit: false, isPrimeEligible: true, previewUrl: 'https://music.amazon.local/previews/prime-track-2.mp3' },
  ];
  const playlist = config.playlist ?? { id: 'PLPRIMESEED', type: 'playlist', name: 'Prime Emulator Mix', description: 'Seeded Amazon Music playlist fixture.', tracks: tracks.map((track) => track.id), images: [image('prime-playlist')] };
  return {
    profile: config.profile ?? { id: 'amzn1.account.EMULATOR', marketplaceId: 'ATVPDKIKX0DER', subscriptionTier: 'PRIME' },
    artists: [artist],
    albums: [album],
    tracks,
    playlists: [playlist],
    libraryTrackIds: config.libraryTrackIds ?? [tracks[0].id],
    player: config.player ?? { isPlaying: false, trackId: tracks[0].id, positionMs: 0, volumePercent: 50 },
  };
}

function state(store) {
  const current = store.getData?.('prime-music:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('prime-music:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('prime-music:state', next);
}

function hit(store, surface) {
  const hits = store.getData?.('prime-music:hits') ?? [];
  hits.push({ surface, at: now() });
  store.setData?.('prime-music:hits', hits);
}

function page(items, limit = items.length, offset = 0) {
  const safeLimit = Number(limit) || items.length;
  const safeOffset = Number(offset) || 0;
  return { items: items.slice(safeOffset, safeOffset + safeLimit), limit: safeLimit, offset: safeOffset, total: items.length, nextToken: null };
}

function byId(items, id) {
  return items.find((item) => item.id === id);
}

function matchesName(item, term) {
  const lower = String(term ?? '').toLowerCase();
  return !lower || item.name.toLowerCase().includes(lower) || item.artists?.some((artist) => artist.name.toLowerCase().includes(lower));
}

function playerPayload(s) {
  const track = byId(s.tracks, s.player.trackId) ?? s.tracks[0];
  return { ...s.player, track, updatedAt: now() };
}

export const contract = {
  provider: 'prime-music',
  source: 'Amazon Music Web API compatible subset for Prime Music catalog, library, and playback workflows',
  docs: 'https://developer.amazon.com/docs/music/API_web_overview.html',
  scope: ['profile', 'search', 'tracks', 'albums', 'playlists', 'library', 'playback'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'prime-music',
  register(app, store) {
    app.get('/v1/me', (c) => {
      hit(store, 'me');
      return c.json(state(store).profile);
    });

    app.get('/v1/search', (c) => {
      hit(store, 'search');
      const s = state(store);
      const term = c.req.query('q') ?? c.req.query('query');
      return c.json({
        tracks: page(s.tracks.filter((track) => matchesName(track, term)), c.req.query('limit'), c.req.query('offset')),
        albums: page(s.albums.filter((album) => matchesName(album, term)), c.req.query('limit'), c.req.query('offset')),
        playlists: page(s.playlists.filter((playlist) => matchesName(playlist, term)), c.req.query('limit'), c.req.query('offset')),
      });
    });

    app.get('/v1/tracks/:id', (c) => {
      const track = byId(state(store).tracks, c.req.param('id'));
      return track ? c.json(track) : c.json({ error: { code: 'NotFound', message: 'Track not found' } }, 404);
    });

    app.get('/v1/albums/:id', (c) => {
      const s = state(store);
      const album = byId(s.albums, c.req.param('id'));
      if (!album) return c.json({ error: { code: 'NotFound', message: 'Album not found' } }, 404);
      return c.json({ ...album, tracks: page(s.tracks.filter((track) => track.album.id === album.id)) });
    });

    app.get('/v1/playlists/:id', (c) => {
      const s = state(store);
      const playlist = byId(s.playlists, c.req.param('id'));
      if (!playlist) return c.json({ error: { code: 'NotFound', message: 'Playlist not found' } }, 404);
      return c.json({ ...playlist, tracks: page(playlist.tracks.map((id) => byId(s.tracks, id)).filter(Boolean)) });
    });

    app.get('/v1/me/library/tracks', (c) => {
      const s = state(store);
      return c.json(page(s.libraryTrackIds.map((id) => byId(s.tracks, id)).filter(Boolean), c.req.query('limit'), c.req.query('offset')));
    });

    app.put('/v1/me/library/tracks/:id', (c) => {
      const s = state(store);
      if (!byId(s.tracks, c.req.param('id'))) return c.json({ error: { code: 'NotFound', message: 'Track not found' } }, 404);
      if (!s.libraryTrackIds.includes(c.req.param('id'))) s.libraryTrackIds.push(c.req.param('id'));
      saveState(store, s);
      return c.json({ trackId: c.req.param('id'), saved: true });
    });

    app.delete('/v1/me/library/tracks/:id', (c) => {
      const s = state(store);
      s.libraryTrackIds = s.libraryTrackIds.filter((id) => id !== c.req.param('id'));
      saveState(store, s);
      return c.body?.(null, 204) ?? c.json({}, 204);
    });

    app.get('/v1/me/player', (c) => c.json(playerPayload(state(store))));

    app.put('/v1/me/player/play', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const trackId = body.trackId ?? body.id ?? s.player.trackId;
      if (!byId(s.tracks, trackId)) return c.json({ error: { code: 'NotFound', message: 'Track not found' } }, 404);
      s.player = { ...s.player, isPlaying: true, trackId, positionMs: body.positionMs ?? 0 };
      saveState(store, s);
      return c.json(playerPayload(s));
    });

    app.put('/v1/me/player/pause', (c) => {
      const s = state(store);
      s.player = { ...s.player, isPlaying: false };
      saveState(store, s);
      return c.json(playerPayload(s));
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

export const label = 'Prime Music API emulator';
export const endpoints = 'Amazon Music profile, search, tracks, albums, playlists, library, playback';
export const capabilities = contract.scope;
export const initConfig = { primeMusic: { ...initialState(), accessToken: 'prime_music_emulator_token' } };
export default plugin;
