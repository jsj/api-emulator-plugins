function now() {
  return new Date().toISOString();
}

function initialState(config = {}) {
  return {
    songs: config.songs ?? [
      { videoId: 'ytm_video_seed', title: 'Localhost Lullaby', artists: [{ name: 'YT Emulator', id: 'ytm_artist_seed' }], album: { name: 'InnerTube Fixtures', id: 'ytm_album_seed' }, duration: '3:12', duration_seconds: 192 },
      { videoId: 'ytm_video_two', title: 'Browse Endpoint Blues', artists: [{ name: 'YT Emulator', id: 'ytm_artist_seed' }], album: { name: 'InnerTube Fixtures', id: 'ytm_album_seed' }, duration: '2:48', duration_seconds: 168 },
    ],
    albums: config.albums ?? [{ browseId: 'ytm_album_seed', title: 'InnerTube Fixtures', type: 'Album', year: '2026', artists: [{ name: 'YT Emulator', id: 'ytm_artist_seed' }] }],
    artists: config.artists ?? [{ browseId: 'ytm_artist_seed', title: 'YT Emulator', subscribers: '42K' }],
    playlists: config.playlists ?? [{ playlistId: 'PL_ytm_seed', title: 'Emulator Radio', description: 'Seeded YouTube Music playlist.', privacyStatus: 'PRIVATE', videoIds: ['ytm_video_seed', 'ytm_video_two'] }],
    likedVideoIds: config.likedVideoIds ?? [],
    subscriptions: config.subscriptions ?? [],
    nextPlaylistId: 2,
  };
}

function state(store) {
  const current = store.getData?.('youtube-music:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('youtube-music:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('youtube-music:state', next);
}

function hit(store, surface) {
  const hits = store.getData?.('youtube-music:hits') ?? [];
  hits.push({ surface, at: now() });
  store.setData?.('youtube-music:hits', hits);
}

function run(text) {
  return { runs: [{ text }] };
}

function songRenderer(song) {
  return {
    musicResponsiveListItemRenderer: {
      playlistItemData: { videoId: song.videoId },
      flexColumns: [
        { musicResponsiveListItemFlexColumnRenderer: { text: run(song.title) } },
        { musicResponsiveListItemFlexColumnRenderer: { text: { runs: song.artists.map((artist) => ({ text: artist.name, navigationEndpoint: { browseEndpoint: { browseId: artist.id } } })) } } },
        { musicResponsiveListItemFlexColumnRenderer: { text: run(song.album.name) } },
      ],
      fixedColumns: [{ musicResponsiveListItemFixedColumnRenderer: { text: run(song.duration) } }],
      overlay: { musicItemThumbnailOverlayRenderer: { content: { musicPlayButtonRenderer: { playNavigationEndpoint: { watchEndpoint: { videoId: song.videoId } } } } } },
    },
  };
}

function shelf(title, songs) {
  return {
    musicShelfRenderer: {
      title: run(title),
      contents: songs.map(songRenderer),
    },
  };
}

function searchPayload(s, query) {
  const term = String(query ?? '').toLowerCase();
  const songs = s.songs.filter((song) => !term || song.title.toLowerCase().includes(term) || song.artists.some((artist) => artist.name.toLowerCase().includes(term)));
  return {
    contents: {
      tabbedSearchResultsRenderer: {
        tabs: [{
          tabRenderer: {
            title: 'Songs',
            selected: true,
            content: { sectionListRenderer: { contents: [shelf('Songs', songs)] } },
          },
        }],
      },
    },
  };
}

function browsePayload(s, browseId) {
  const album = s.albums.find((item) => item.browseId === browseId);
  if (album) {
    return {
      contents: { singleColumnBrowseResultsRenderer: { tabs: [{ tabRenderer: { content: { sectionListRenderer: { contents: [shelf(album.title, s.songs)] } } } }] } },
      header: { musicDetailHeaderRenderer: { title: run(album.title), subtitle: run(album.artists[0]?.name ?? '') } },
    };
  }
  const artist = s.artists.find((item) => item.browseId === browseId);
  if (artist) {
    return {
      contents: { singleColumnBrowseResultsRenderer: { tabs: [{ tabRenderer: { content: { sectionListRenderer: { contents: [shelf('Top songs', s.songs)] } } } }] } },
      header: { musicImmersiveHeaderRenderer: { title: run(artist.title), subscriptionButton: { subscribeButtonRenderer: { channelId: artist.browseId } } } },
    };
  }
  const playlist = s.playlists.find((item) => item.playlistId === browseId || `VL${item.playlistId}` === browseId);
  if (playlist) {
    const songs = playlist.videoIds.map((id) => s.songs.find((song) => song.videoId === id)).filter(Boolean);
    return {
      contents: { singleColumnBrowseResultsRenderer: { tabs: [{ tabRenderer: { content: { sectionListRenderer: { contents: [shelf(playlist.title, songs)] } } } }] } },
      header: { musicEditablePlaylistDetailHeaderRenderer: { header: { musicDetailHeaderRenderer: { title: run(playlist.title), description: run(playlist.description) } } } },
    };
  }
  return { contents: { sectionListRenderer: { contents: [shelf('Songs', s.songs)] } } };
}

export const contract = {
  provider: 'youtube-music',
  source: 'YouTube Music InnerTube compatible subset for ytmusicapi-based CLIs',
  docs: 'https://github.com/sigma67/ytmusicapi',
  scope: ['search', 'browse', 'player', 'next', 'playlist-create', 'playlist-edit', 'like', 'subscribe'],
  fidelity: 'stateful-inner-tube-emulator',
};

export const plugin = {
  name: 'youtube-music',
  register(app, store) {
    app.get('/', (c) => c.text?.('YouTube Music emulator') ?? c.json({ ok: true }));

    app.post('/youtubei/v1/search', async (c) => {
      hit(store, 'search');
      const body = await c.req.json().catch(() => ({}));
      return c.json(searchPayload(state(store), body.query));
    });

    app.post('/youtubei/v1/browse', async (c) => {
      hit(store, 'browse');
      const body = await c.req.json().catch(() => ({}));
      return c.json(browsePayload(state(store), body.browseId));
    });

    app.post('/youtubei/v1/player', async (c) => {
      hit(store, 'player');
      const body = await c.req.json().catch(() => ({}));
      const s = state(store);
      const song = s.songs.find((item) => item.videoId === body.videoId) ?? s.songs[0];
      return c.json({
        playabilityStatus: { status: 'OK' },
        videoDetails: { videoId: song.videoId, title: song.title, lengthSeconds: String(song.duration_seconds), author: song.artists.map((artist) => artist.name).join(', ') },
        streamingData: { expiresInSeconds: '21540', formats: [{ itag: 140, mimeType: 'audio/mp4', bitrate: 128000, url: `https://music.youtube.local/stream/${song.videoId}.m4a` }] },
      });
    });

    app.post('/youtubei/v1/next', async (c) => {
      hit(store, 'next');
      const body = await c.req.json().catch(() => ({}));
      const s = state(store);
      const current = s.songs.findIndex((song) => song.videoId === body.videoId);
      const nextSongs = s.songs.slice(Math.max(0, current + 1)).concat(s.songs.slice(0, Math.max(0, current + 1)));
      return c.json({
        contents: {
          singleColumnMusicWatchNextResultsRenderer: {
            tabbedRenderer: {
              watchNextTabbedResultsRenderer: {
                tabs: [{
                  tabRenderer: {
                    content: {
                      musicQueueRenderer: {
                        content: {
                          playlistPanelRenderer: {
                            contents: nextSongs.map(songRenderer),
                          },
                        },
                      },
                    },
                  },
                }],
              },
            },
          },
        },
      });
    });

    app.post('/youtubei/v1/playlist/create', async (c) => {
      hit(store, 'playlist.create');
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const playlist = { playlistId: `PL_ytm_${s.nextPlaylistId++}`, title: body.title ?? 'New Emulator Playlist', description: body.description ?? '', privacyStatus: body.privacyStatus ?? 'PRIVATE', videoIds: body.videoIds ?? [] };
      s.playlists.push(playlist);
      saveState(store, s);
      return c.json({ playlistId: playlist.playlistId, status: 'STATUS_SUCCEEDED' });
    });

    app.post('/youtubei/v1/browse/edit_playlist', async (c) => {
      hit(store, 'playlist.edit');
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const playlist = s.playlists.find((item) => item.playlistId === body.playlistId) ?? s.playlists[0];
      const actions = body.actions ?? [];
      for (const action of actions) {
        if (action.action === 'ACTION_ADD_VIDEO' && action.addedVideoId) playlist.videoIds.push(action.addedVideoId);
        if (action.action === 'ACTION_REMOVE_VIDEO_BY_VIDEO_ID' && action.removedVideoId) playlist.videoIds = playlist.videoIds.filter((id) => id !== action.removedVideoId);
      }
      saveState(store, s);
      return c.json({ status: 'STATUS_SUCCEEDED', playlistId: playlist.playlistId });
    });

    app.post('/youtubei/v1/like/like', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      if (body.target?.videoId && !s.likedVideoIds.includes(body.target.videoId)) s.likedVideoIds.push(body.target.videoId);
      saveState(store, s);
      return c.json({ status: 'STATUS_SUCCEEDED' });
    });

    app.post('/youtubei/v1/subscription/subscribe', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const channelId = body.channelIds?.[0] ?? body.channelId ?? 'ytm_artist_seed';
      if (!s.subscriptions.includes(channelId)) s.subscriptions.push(channelId);
      saveState(store, s);
      return c.json({ responseContext: {}, actions: [] });
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

export const label = 'YouTube Music API emulator';
export const endpoints = 'InnerTube search, browse, player, next, playlist create/edit, like, subscribe';
export const capabilities = contract.scope;
export const initConfig = { youtubeMusic: initialState() };
export default plugin;
