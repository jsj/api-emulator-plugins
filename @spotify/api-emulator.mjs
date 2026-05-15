function now() {
  return new Date().toISOString();
}

function image(id, size = 640) {
  return { url: `https://placehold.co/${size}x${size}/1db954/121212.jpg?text=${encodeURIComponent(id)}`, height: size, width: size };
}

function initialState(config = {}) {
  const artist = config.artist ?? {
    id: 'spotify_artist_seed',
    name: 'The Emulator Band',
    type: 'artist',
    uri: 'spotify:artist:spotify_artist_seed',
    href: '/v1/artists/spotify_artist_seed',
    external_urls: { spotify: 'https://open.spotify.com/artist/spotify_artist_seed' },
    images: [image('artist')],
    genres: ['indie api'],
    popularity: 65,
  };
  const album = config.album ?? {
    id: 'spotify_album_seed',
    name: 'Localhost Sessions',
    type: 'album',
    album_type: 'album',
    uri: 'spotify:album:spotify_album_seed',
    href: '/v1/albums/spotify_album_seed',
    external_urls: { spotify: 'https://open.spotify.com/album/spotify_album_seed' },
    artists: [artist],
    images: [image('album')],
    release_date: '2026-05-15',
    total_tracks: 2,
  };
  const tracks = config.tracks ?? [
    {
      id: 'spotify_track_seed',
      name: 'Mockingbird API',
      type: 'track',
      uri: 'spotify:track:spotify_track_seed',
      href: '/v1/tracks/spotify_track_seed',
      duration_ms: 183000,
      explicit: false,
      popularity: 72,
      track_number: 1,
      artists: [artist],
      album,
      external_urls: { spotify: 'https://open.spotify.com/track/spotify_track_seed' },
    },
    {
      id: 'spotify_track_two',
      name: 'Deterministic Shuffle',
      type: 'track',
      uri: 'spotify:track:spotify_track_two',
      href: '/v1/tracks/spotify_track_two',
      duration_ms: 201000,
      explicit: false,
      popularity: 61,
      track_number: 2,
      artists: [artist],
      album,
      external_urls: { spotify: 'https://open.spotify.com/track/spotify_track_two' },
    },
  ];
  const show = config.show ?? {
    id: 'spotify_show_seed',
    name: 'Emulator FM',
    type: 'show',
    uri: 'spotify:show:spotify_show_seed',
    publisher: 'API Emulator',
    description: 'A seeded podcast show for CLI compatibility tests.',
    total_episodes: 1,
    external_urls: { spotify: 'https://open.spotify.com/show/spotify_show_seed' },
  };
  const episode = config.episode ?? {
    id: 'spotify_episode_seed',
    name: 'The Mock Episode',
    type: 'episode',
    uri: 'spotify:episode:spotify_episode_seed',
    description: 'A seeded podcast episode fixture.',
    duration_ms: 120000,
    external_urls: { spotify: 'https://open.spotify.com/episode/spotify_episode_seed' },
  };
  const playlist = config.playlist ?? {
    id: 'spotify_playlist_seed',
    name: 'Emulator Mix',
    type: 'playlist',
    uri: 'spotify:playlist:spotify_playlist_seed',
    href: '/v1/playlists/spotify_playlist_seed',
    public: false,
    collaborative: false,
    description: 'Seeded Spotify Web API playlist fixture.',
    owner: { id: 'spotify_user_seed', type: 'user', display_name: 'Emulator User', uri: 'spotify:user:spotify_user_seed' },
    images: [image('playlist')],
    tracks: { total: tracks.length, items: tracks.map((track) => ({ added_at: now(), track })) },
  };
  return {
    profile: config.profile ?? { id: 'spotify_user_seed', display_name: 'Emulator User', type: 'user', uri: 'spotify:user:spotify_user_seed', product: 'premium' },
    artists: [artist],
    albums: [album],
    tracks,
    shows: [show],
    episodes: [episode],
    playlists: [playlist],
    devices: config.devices ?? [{ id: 'spotify_device_seed', name: 'Localhost Speaker', type: 'Computer', is_active: true, is_private_session: false, is_restricted: false, volume_percent: 42 }],
    player: config.player ?? { is_playing: false, progress_ms: 0, repeat_state: 'off', shuffle_state: false, volume_percent: 42, device_id: 'spotify_device_seed', item_id: 'spotify_track_seed' },
    queue: config.queue ?? [],
    savedTrackIds: config.savedTrackIds ?? tracks.map((track) => track.id),
    savedAlbumIds: config.savedAlbumIds ?? [album.id],
    followedArtistIds: config.followedArtistIds ?? [artist.id],
    nextPlaylistId: 2,
  };
}

function state(store) {
  const current = store.getData?.('spotify:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('spotify:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('spotify:state', next);
}

function page(items, limit = items.length || 20, offset = 0) {
  const safeLimit = Number(limit) || items.length || 20;
  const safeOffset = Number(offset) || 0;
  return { href: '', items: items.slice(safeOffset, safeOffset + safeLimit), limit: safeLimit, next: null, offset: safeOffset, previous: null, total: items.length };
}

function byId(items, id) {
  return items.find((item) => item.id === id || item.uri === id);
}

function trackByUriOrId(s, value) {
  return s.tracks.find((track) => track.id === value || track.uri === value) ?? s.tracks[0];
}

function playerPayload(s) {
  return {
    timestamp: Date.now(),
    context: { type: 'playlist', uri: s.playlists[0].uri },
    progress_ms: s.player.progress_ms,
    is_playing: s.player.is_playing,
    shuffle_state: s.player.shuffle_state,
    repeat_state: s.player.repeat_state,
    device: s.devices.find((device) => device.id === s.player.device_id) ?? s.devices[0],
    item: trackByUriOrId(s, s.player.item_id),
    currently_playing_type: 'track',
    actions: { disallows: {} },
  };
}

function hit(store, surface) {
  const hits = store.getData?.('spotify:hits') ?? [];
  hits.push({ surface, at: now() });
  store.setData?.('spotify:hits', hits);
}

export const contract = {
  provider: 'spotify',
  source: 'Spotify Web API compatible subset for OSS CLIs such as openclaw/spogo',
  docs: 'https://developer.spotify.com/documentation/web-api',
  scope: ['search', 'catalog', 'playlists', 'library', 'player', 'queue'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'spotify',
  register(app, store) {
    app.get('/v1/me', (c) => {
      hit(store, 'me');
      return c.json(state(store).profile);
    });

    app.get('/api/token', (c) => c.json({
      accessToken: 'spotify_emulator_access_token',
      expiresIn: 3600,
      accessTokenExpirationTimestampMs: Date.now() + 3600000,
      isAnonymous: false,
      clientId: 'spotify_emulator_client',
    }));

    app.get('/v1/search', (c) => {
      hit(store, 'search');
      const s = state(store);
      const term = (c.req.query('q') ?? '').toLowerCase();
      const types = (c.req.query('type') ?? 'track,album,artist,playlist').split(',');
      const matches = (items) => items.filter((item) => {
        if (!term) return true;
        const haystack = [
          item.name,
          item.album?.name,
          ...(item.artists ?? []).map((artist) => artist.name),
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(term);
      });
      const payload = {};
      if (types.includes('track')) payload.tracks = payload.track = page(matches(s.tracks), c.req.query('limit'), c.req.query('offset'));
      if (types.includes('album')) payload.albums = payload.album = page(matches(s.albums), c.req.query('limit'), c.req.query('offset'));
      if (types.includes('artist')) payload.artists = payload.artist = page(matches(s.artists), c.req.query('limit'), c.req.query('offset'));
      if (types.includes('playlist')) payload.playlists = payload.playlist = page(matches(s.playlists), c.req.query('limit'), c.req.query('offset'));
      if (types.includes('show')) payload.shows = payload.show = page(matches(s.shows), c.req.query('limit'), c.req.query('offset'));
      if (types.includes('episode')) payload.episodes = payload.episode = page(matches(s.episodes), c.req.query('limit'), c.req.query('offset'));
      return c.json(payload);
    });

    app.get('/v1/tracks/:id', (c) => c.json(byId(state(store).tracks, c.req.param('id')) ?? { error: { status: 404, message: 'Not found' } }, byId(state(store).tracks, c.req.param('id')) ? 200 : 404));
    app.get('/v1/albums/:id', (c) => c.json(byId(state(store).albums, c.req.param('id')) ?? { error: { status: 404, message: 'Not found' } }, byId(state(store).albums, c.req.param('id')) ? 200 : 404));
    app.get('/v1/artists/:id', (c) => c.json(byId(state(store).artists, c.req.param('id')) ?? { error: { status: 404, message: 'Not found' } }, byId(state(store).artists, c.req.param('id')) ? 200 : 404));
    app.get('/v1/shows/:id', (c) => c.json(byId(state(store).shows, c.req.param('id')) ?? { error: { status: 404, message: 'Not found' } }, byId(state(store).shows, c.req.param('id')) ? 200 : 404));
    app.get('/v1/episodes/:id', (c) => c.json(byId(state(store).episodes, c.req.param('id')) ?? { error: { status: 404, message: 'Not found' } }, byId(state(store).episodes, c.req.param('id')) ? 200 : 404));
    app.get('/v1/artists/:id/top-tracks', (c) => c.json({ tracks: state(store).tracks.filter((track) => track.artists.some((artist) => artist.id === c.req.param('id'))) }));

    app.get('/v1/me/playlists', (c) => c.json(page(state(store).playlists, c.req.query('limit'), c.req.query('offset'))));
    app.post('/v1/users/:userId/playlists', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const playlist = {
        id: `spotify_playlist_${s.nextPlaylistId++}`,
        name: body.name ?? 'New Emulator Playlist',
        type: 'playlist',
        uri: `spotify:playlist:spotify_playlist_${s.nextPlaylistId}`,
        public: body.public ?? false,
        description: body.description ?? '',
        owner: { ...s.profile, id: c.req.param('userId') },
        tracks: { total: 0, items: [] },
      };
      s.playlists.push(playlist);
      saveState(store, s);
      return c.json(playlist, 201);
    });
    app.get('/v1/playlists/:id', (c) => c.json(byId(state(store).playlists, c.req.param('id')) ?? { error: { status: 404, message: 'Not found' } }, byId(state(store).playlists, c.req.param('id')) ? 200 : 404));
    app.get('/v1/playlists/:id/tracks', (c) => {
      const playlist = byId(state(store).playlists, c.req.param('id'));
      return playlist ? c.json(page(playlist.tracks.items, c.req.query('limit'), c.req.query('offset'))) : c.json({ error: { status: 404, message: 'Not found' } }, 404);
    });
    app.post('/v1/playlists/:id/tracks', async (c) => {
      const s = state(store);
      const playlist = byId(s.playlists, c.req.param('id'));
      if (!playlist) return c.json({ error: { status: 404, message: 'Not found' } }, 404);
      const body = await c.req.json().catch(() => ({}));
      const uris = body.uris ?? (c.req.query('uris') ? c.req.query('uris').split(',') : []);
      for (const uri of uris) playlist.tracks.items.push({ added_at: now(), track: trackByUriOrId(s, uri) });
      playlist.tracks.total = playlist.tracks.items.length;
      saveState(store, s);
      return c.json({ snapshot_id: `snapshot_${Date.now()}` }, 201);
    });
    app.delete('/v1/playlists/:id/tracks', async (c) => {
      const s = state(store);
      const playlist = byId(s.playlists, c.req.param('id'));
      if (!playlist) return c.json({ error: { status: 404, message: 'Not found' } }, 404);
      const body = await c.req.json().catch(() => ({}));
      const remove = new Set((body.tracks ?? []).map((item) => item.uri));
      playlist.tracks.items = playlist.tracks.items.filter((item) => !remove.has(item.track.uri));
      playlist.tracks.total = playlist.tracks.items.length;
      saveState(store, s);
      return c.json({ snapshot_id: `snapshot_${Date.now()}` });
    });

    app.get('/v1/me/tracks', (c) => {
      const s = state(store);
      return c.json(page(s.tracks.filter((track) => s.savedTrackIds.includes(track.id)).map((track) => ({ added_at: now(), track })), c.req.query('limit'), c.req.query('offset')));
    });
    app.put('/v1/me/tracks', (c) => {
      const s = state(store);
      for (const id of (c.req.query('ids') ?? '').split(',').filter(Boolean)) if (!s.savedTrackIds.includes(id)) s.savedTrackIds.push(id);
      saveState(store, s);
      return c.body?.(null, 200) ?? c.json({});
    });
    app.delete('/v1/me/tracks', (c) => {
      const s = state(store);
      const ids = new Set((c.req.query('ids') ?? '').split(',').filter(Boolean));
      s.savedTrackIds = s.savedTrackIds.filter((id) => !ids.has(id));
      saveState(store, s);
      return c.body?.(null, 200) ?? c.json({});
    });
    app.get('/v1/me/albums', (c) => {
      const s = state(store);
      return c.json(page(s.albums.filter((album) => s.savedAlbumIds.includes(album.id)).map((album) => ({ added_at: now(), album })), c.req.query('limit'), c.req.query('offset')));
    });
    app.put('/v1/me/albums', (c) => {
      const s = state(store);
      for (const id of (c.req.query('ids') ?? '').split(',').filter(Boolean)) if (!s.savedAlbumIds.includes(id)) s.savedAlbumIds.push(id);
      saveState(store, s);
      return c.body?.(null, 200) ?? c.json({});
    });
    app.delete('/v1/me/albums', (c) => {
      const s = state(store);
      const ids = new Set((c.req.query('ids') ?? '').split(',').filter(Boolean));
      s.savedAlbumIds = s.savedAlbumIds.filter((id) => !ids.has(id));
      saveState(store, s);
      return c.body?.(null, 200) ?? c.json({});
    });
    app.get('/v1/me/following', (c) => {
      const s = state(store);
      const artists = s.artists.filter((artist) => s.followedArtistIds.includes(artist.id));
      return c.json({ artists: page(artists, c.req.query('limit'), 0) });
    });
    app.put('/v1/me/following', (c) => {
      const s = state(store);
      for (const id of (c.req.query('ids') ?? '').split(',').filter(Boolean)) if (!s.followedArtistIds.includes(id)) s.followedArtistIds.push(id);
      saveState(store, s);
      return c.body?.(null, 204) ?? c.json({}, 204);
    });
    app.delete('/v1/me/following', (c) => {
      const s = state(store);
      const ids = new Set((c.req.query('ids') ?? '').split(',').filter(Boolean));
      s.followedArtistIds = s.followedArtistIds.filter((id) => !ids.has(id));
      saveState(store, s);
      return c.body?.(null, 204) ?? c.json({}, 204);
    });
    app.get('/v1/me/player', (c) => c.json(playerPayload(state(store))));
    app.get('/v1/me/player/devices', (c) => c.json({ devices: state(store).devices }));
    app.put('/v1/me/player', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const deviceId = body.device_ids?.[0];
      if (deviceId) {
        s.player.device_id = deviceId;
        s.devices = s.devices.map((device) => ({ ...device, is_active: device.id === deviceId }));
      }
      saveState(store, s);
      return c.body?.(null, 204) ?? c.json({}, 204);
    });
    app.put('/v1/me/player/play', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      s.player.is_playing = true;
      if (body.uris?.[0]) s.player.item_id = body.uris[0];
      saveState(store, s);
      return c.body?.(null, 204) ?? c.json({}, 204);
    });
    app.put('/v1/me/player/pause', (c) => {
      const s = state(store);
      s.player.is_playing = false;
      saveState(store, s);
      return c.body?.(null, 204) ?? c.json({}, 204);
    });
    app.post('/v1/me/player/next', (c) => c.body?.(null, 204) ?? c.json({}, 204));
    app.post('/v1/me/player/previous', (c) => c.body?.(null, 204) ?? c.json({}, 204));
    app.put('/v1/me/player/volume', (c) => {
      const s = state(store);
      s.player.volume_percent = Number(c.req.query('volume_percent') ?? s.player.volume_percent);
      saveState(store, s);
      return c.body?.(null, 204) ?? c.json({}, 204);
    });
    app.put('/v1/me/player/seek', (c) => {
      const s = state(store);
      s.player.progress_ms = Number(c.req.query('position_ms') ?? s.player.progress_ms);
      saveState(store, s);
      return c.body?.(null, 204) ?? c.json({}, 204);
    });
    app.put('/v1/me/player/shuffle', (c) => {
      const s = state(store);
      s.player.shuffle_state = c.req.query('state') === 'true';
      saveState(store, s);
      return c.body?.(null, 204) ?? c.json({}, 204);
    });
    app.put('/v1/me/player/repeat', (c) => {
      const s = state(store);
      s.player.repeat_state = c.req.query('state') ?? 'off';
      saveState(store, s);
      return c.body?.(null, 204) ?? c.json({}, 204);
    });
    app.post('/v1/me/player/queue', (c) => {
      const s = state(store);
      s.queue.push(trackByUriOrId(s, c.req.query('uri')));
      saveState(store, s);
      return c.body?.(null, 204) ?? c.json({}, 204);
    });
    app.get('/v1/me/player/queue', (c) => c.json({ currently_playing: playerPayload(state(store)).item, queue: state(store).queue }));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
  seed(store, _baseUrl, config = {}) {
    saveState(store, initialState(config));
  },
};

export function seedFromConfig(store, baseUrl, config = {}) {
  plugin.seed(store, baseUrl, config);
}

export const label = 'Spotify Web API emulator';
export const endpoints = 'search, tracks, albums, artists, playlists, saved library, player controls, queue';
export const capabilities = contract.scope;
export const initConfig = { spotify: initialState() };
export default plugin;
