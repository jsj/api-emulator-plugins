function now() {
  return new Date().toISOString();
}

function base64Url(input) {
  return Buffer.from(JSON.stringify(input)).toString('base64url');
}

export function developerToken({ teamId = 'TEAMID1234', keyId = 'KEYID1234', expiresInSeconds = 15777000 } = {}) {
  const issuedAt = Math.floor(Date.now() / 1000);
  return [
    base64Url({ alg: 'ES256', kid: keyId, typ: 'JWT' }),
    base64Url({
      iss: teamId,
      iat: issuedAt,
      exp: issuedAt + expiresInSeconds,
      origin: 'apple-music-emulator',
    }),
    'emulator-signature',
  ].join('.');
}

function initialState(config = {}) {
  return {
    storefront: config.storefront ?? 'us',
    songs: config.songs ?? [
      { id: 'apple_song_seed', type: 'songs', attributes: { name: 'Cupertino Mock', artistName: 'Apple Emulator', albumName: 'MusicKit Fixtures', durationInMillis: 196000, isrc: 'EMUAPPLE0001', previews: [{ url: 'https://audio-ssl.itunes.apple.com/emulator/cupertino-mock.m4a' }], artwork: { url: 'https://placehold.co/{w}x{h}/fa243c/ffffff.jpg?text=Apple+Music', width: 1200, height: 1200 } } },
      { id: 'apple_song_two', type: 'songs', attributes: { name: 'Library Sync Waltz', artistName: 'Apple Emulator', albumName: 'MusicKit Fixtures', durationInMillis: 174000, isrc: 'EMUAPPLE0002', previews: [{ url: 'https://audio-ssl.itunes.apple.com/emulator/library-sync.m4a' }], artwork: { url: 'https://placehold.co/{w}x{h}/fa243c/ffffff.jpg?text=Apple+Music', width: 1200, height: 1200 } } },
    ],
    albums: config.albums ?? [{ id: 'apple_album_seed', type: 'albums', attributes: { name: 'MusicKit Fixtures', artistName: 'Apple Emulator', trackCount: 2, releaseDate: '2026-05-15', artwork: { url: 'https://placehold.co/{w}x{h}/fa243c/ffffff.jpg?text=Album', width: 1200, height: 1200 } } }],
    artists: config.artists ?? [{ id: 'apple_artist_seed', type: 'artists', attributes: { name: 'Apple Emulator' } }],
    playlists: config.playlists ?? [{ id: 'apple_playlist_seed', type: 'library-playlists', attributes: { name: 'Emulator Favorites', description: { standard: 'Seeded Apple Music playlist fixture.' }, canEdit: true, dateAdded: now() }, relationships: { tracks: { data: [{ id: 'apple_song_seed', type: 'library-songs' }] } } }],
    nextPlaylistId: 2,
  };
}

function state(store) {
  const current = store.getData?.('apple-music:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('apple-music:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('apple-music:state', next);
}

function hit(store, surface) {
  const hits = store.getData?.('apple-music:hits') ?? [];
  hits.push({ surface, at: now() });
  store.setData?.('apple-music:hits', hits);
}

function document(data, extra = {}) {
  return { data, ...extra };
}

function filterByTerm(items, term) {
  const lower = String(term ?? '').toLowerCase();
  return items.filter((item) => !lower || item.attributes.name.toLowerCase().includes(lower) || item.attributes.artistName?.toLowerCase().includes(lower));
}

function itunesResult(song, index) {
  return {
    wrapperType: 'track',
    kind: 'song',
    trackId: index + 1000,
    collectionId: 2000,
    artistName: song.attributes.artistName,
    collectionName: song.attributes.albumName,
    trackName: song.attributes.name,
    trackTimeMillis: song.attributes.durationInMillis,
    previewUrl: song.attributes.previews?.[0]?.url,
    artworkUrl100: song.attributes.artwork?.url?.replace('{w}', '100').replace('{h}', '100'),
    country: 'USA',
    primaryGenreName: 'Pop',
  };
}

function playlistTracks(s, playlist) {
  const ids = new Set(playlist.relationships?.tracks?.data?.map((item) => item.id) ?? []);
  return s.songs.filter((song) => ids.has(song.id)).map((song) => ({ ...song, type: 'library-songs' }));
}

function playlistDescription(value) {
  if (value && typeof value === 'object') return value;
  return { standard: value ? String(value) : '' };
}

export const contract = {
  provider: 'apple-music',
  source: 'Apple Music API and iTunes Search compatible subset for MusicKit CLIs',
  docs: 'https://developer.apple.com/documentation/applemusicapi',
  scope: ['itunes-search', 'catalog-search', 'catalog-songs', 'library-playlists', 'playlist-tracks'],
  fidelity: 'stateful-json-api-emulator',
};

export const plugin = {
  name: 'apple-music',
  register(app, store) {
    app.get('/search', (c) => {
      hit(store, 'itunes.search');
      const s = state(store);
      const results = filterByTerm(s.songs, c.req.query('term')).map(itunesResult);
      return c.json({ resultCount: results.length, results });
    });

    app.get('/v1/catalog/:storefront/search', (c) => {
      hit(store, 'catalog.search');
      const s = state(store);
      const term = c.req.query('term');
      const types = (c.req.query('types') ?? 'songs,albums,artists').split(',');
      const results = {};
      if (types.includes('songs')) results.songs = document(filterByTerm(s.songs, term), { href: c.req.url });
      if (types.includes('albums')) results.albums = document(filterByTerm(s.albums, term), { href: c.req.url });
      if (types.includes('artists')) results.artists = document(filterByTerm(s.artists, term), { href: c.req.url });
      return c.json({ results });
    });

    app.get('/v1/catalog/:storefront/songs/:id', (c) => {
      const song = state(store).songs.find((item) => item.id === c.req.param('id'));
      return song ? c.json(document([song])) : c.json({ errors: [{ status: '404', title: 'Not Found' }] }, 404);
    });
    app.get('/v1/catalog/:storefront/albums/:id', (c) => {
      const album = state(store).albums.find((item) => item.id === c.req.param('id'));
      return album ? c.json(document([album])) : c.json({ errors: [{ status: '404', title: 'Not Found' }] }, 404);
    });
    app.get('/v1/catalog/:storefront/artists/:id', (c) => {
      const artist = state(store).artists.find((item) => item.id === c.req.param('id'));
      return artist ? c.json(document([artist])) : c.json({ errors: [{ status: '404', title: 'Not Found' }] }, 404);
    });

    app.get('/v1/me/library/playlists', (c) => {
      hit(store, 'library.playlists.list');
      return c.json(document(state(store).playlists));
    });

    app.post('/v1/me/library/playlists', async (c) => {
      hit(store, 'library.playlists.create');
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const attributes = body.attributes ?? body.data?.attributes ?? {};
      const relationships = body.relationships ?? body.data?.relationships ?? { tracks: { data: [] } };
      const playlist = {
        id: `apple_playlist_${s.nextPlaylistId++}`,
        type: 'library-playlists',
        attributes: {
          name: attributes.name ?? 'New Emulator Playlist',
          description: playlistDescription(attributes.description),
          canEdit: true,
          dateAdded: now(),
        },
        relationships,
      };
      s.playlists.push(playlist);
      saveState(store, s);
      return c.json(document([playlist]), 201);
    });

    app.get('/v1/me/library/playlists/:id', (c) => {
      const playlist = state(store).playlists.find((item) => item.id === c.req.param('id'));
      return playlist ? c.json(document([playlist])) : c.json({ errors: [{ status: '404', title: 'Not Found' }] }, 404);
    });

    app.put('/v1/me/library/playlists/:id', async (c) => {
      const s = state(store);
      const playlist = s.playlists.find((item) => item.id === c.req.param('id'));
      if (!playlist) return c.json({ errors: [{ status: '404', title: 'Not Found' }] }, 404);
      const body = await c.req.json().catch(() => ({}));
      const attributes = body.attributes ?? body.data?.attributes ?? {};
      playlist.attributes = { ...playlist.attributes, ...attributes };
      if ('description' in attributes) playlist.attributes.description = playlistDescription(attributes.description);
      saveState(store, s);
      return c.json(document([playlist]));
    });

    app.delete('/v1/me/library/playlists/:id', (c) => {
      const s = state(store);
      s.playlists = s.playlists.filter((item) => item.id !== c.req.param('id'));
      saveState(store, s);
      return c.body?.(null, 204) ?? c.json({}, 204);
    });

    app.get('/v1/me/library/playlists/:id/tracks', (c) => {
      const s = state(store);
      const playlist = s.playlists.find((item) => item.id === c.req.param('id'));
      return playlist ? c.json(document(playlistTracks(s, playlist))) : c.json({ errors: [{ status: '404', title: 'Not Found' }] }, 404);
    });

    app.post('/v1/me/library/playlists/:id/tracks', async (c) => {
      const s = state(store);
      const playlist = s.playlists.find((item) => item.id === c.req.param('id'));
      if (!playlist) return c.json({ errors: [{ status: '404', title: 'Not Found' }] }, 404);
      const body = await c.req.json().catch(() => ({}));
      const data = body.data ?? body.relationships?.tracks?.data ?? [];
      playlist.relationships ??= {};
      playlist.relationships.tracks ??= { data: [] };
      for (const item of data) {
        if (!playlist.relationships.tracks.data.some((track) => track.id === item.id)) {
          playlist.relationships.tracks.data.push({ id: item.id, type: item.type ?? 'library-songs' });
        }
      }
      saveState(store, s);
      return c.body?.(null, 202) ?? c.json({}, 202);
    });

    app.delete('/v1/me/library/playlists/:id/tracks', (c) => {
      const s = state(store);
      const playlist = s.playlists.find((item) => item.id === c.req.param('id'));
      if (!playlist) return c.json({ errors: [{ status: '404', title: 'Not Found' }] }, 404);
      const ids = new Set(c.req.queries?.('ids[library-songs]') ?? [c.req.query('ids[library-songs]')].filter(Boolean));
      playlist.relationships.tracks.data = playlist.relationships.tracks.data.filter((item) => !ids.has(item.id));
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

export const label = 'Apple Music API emulator';
export const endpoints = 'iTunes song search, Apple Music catalog search/songs/albums/artists, library playlists and tracks';
export const capabilities = contract.scope;
export const initConfig = { appleMusic: { ...initialState(), teamId: 'TEAMID1234', keyId: 'KEYID1234', developerToken: developerToken(), userToken: 'apple_music_emulator_user_token' } };
export default plugin;
