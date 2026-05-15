import { existsSync, readFileSync } from 'node:fs';

const SERVER_ID = 'emu_piratebay_server_001';
const USER_ID = 'emu_piratebay_user_001';
const ACCESS_TOKEN = 'emu_piratebay_access_token_001';
const DEVICE_ID = 'emu_generic_device_001';
const BIG_BUCK_BUNNY_STREAM_URL = 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4';

let mediaItems = [
  {
    Id: 'movie-big-buck-bunny-001',
    Name: 'Big Buck Bunny',
    Type: 'Movie',
    MediaType: 'Video',
    Overview: 'Open movie fixture from Blender Foundation for real playback smoke tests.',
    RunTimeTicks: 5_964_000_0000,
    ProductionYear: 2008,
    Studios: [{ Name: 'Blender Foundation' }],
    Tags: ['Open Movie', 'Creative Commons', '2D'],
    ProviderIds: { Imdb: 'tt1254207' },
    UserData: {
      PlaybackPositionTicks: 0,
      PlayedPercentage: 0,
      IsFavorite: false,
      Played: false,
    },
    ImageTags: { Primary: 'bbb-primary' },
    Artwork: {
      Primary: 'https://image.tmdb.org/t/p/w500/rB2mD7i9v8JcM9y9O8ivO6i0ias.jpg',
      Backdrop: 'https://image.tmdb.org/t/p/w1280/2H4yL1S04Nuh7wYQ7P0WlT9t5Rz.jpg',
    },
    Etag: 'bbb-etag',
    EmulatorStreamUrl: BIG_BUCK_BUNNY_STREAM_URL,
    EmulatorLicense: 'Creative Commons Attribution 3.0',
    MediaSources: [
      {
        Id: 'media-source-big-buck-bunny-001',
        Path: BIG_BUCK_BUNNY_STREAM_URL,
        Container: 'mp4',
        Size: 64657027,
        Name: 'Big Buck Bunny',
        IsRemote: true,
        RunTimeTicks: 5_964_000_0000,
        SupportsDirectStream: true,
        SupportsDirectPlay: true,
        SupportsTranscoding: true,
        MediaStreams: [
          { Index: 0, Type: 'Video', Codec: 'h264', Width: 320, Height: 180, IsDefault: true },
          { Index: 1, Type: 'Audio', Codec: 'aac', Channels: 2, IsDefault: true },
        ],
      },
    ],
  },
  {
    Id: 'movie-flat-001',
    Name: 'Generic Flat Demo',
    Type: 'Movie',
    MediaType: 'Video',
    Overview: 'A 2D direct-play fixture for generic playback tests.',
    RunTimeTicks: 5_400_000_0000,
    UserData: {
      PlaybackPositionTicks: 900_000_0000,
      PlayedPercentage: 16.67,
      IsFavorite: false,
      Played: false,
    },
    ImageTags: { Primary: 'flat-primary' },
    Artwork: {
      Primary: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      Backdrop: 'https://image.tmdb.org/t/p/w1280/5P8SmMzSNYikXpxil6BYzJ16611.jpg',
    },
    Etag: 'flat-etag',
    MediaSources: [
      {
        Id: 'media-source-flat-001',
        Path: '/media/generic-flat-demo.mp4',
        Container: 'mp4',
        Size: 1000000,
        Name: 'Generic Flat Demo',
        IsRemote: false,
        RunTimeTicks: 5_400_000_0000,
        SupportsDirectStream: true,
        SupportsDirectPlay: true,
        SupportsTranscoding: true,
        MediaStreams: [
          { Index: 0, Type: 'Video', Codec: 'h264', Width: 1920, Height: 1080, IsDefault: true },
          { Index: 1, Type: 'Audio', Codec: 'aac', Channels: 2, IsDefault: true },
        ],
      },
    ],
  },
  {
    Id: 'movie-sbs-001',
    Name: 'Generic 3D SBS Demo',
    Type: 'Movie',
    MediaType: 'Video',
    Overview: 'A side-by-side stereoscopic fixture for projection testing.',
    RunTimeTicks: 4_200_000_0000,
    UserData: { PlaybackPositionTicks: 0, PlayedPercentage: 0, IsFavorite: false, Played: false },
    ImageTags: { Primary: 'sbs-primary' },
    Artwork: {
      Primary: 'https://image.tmdb.org/t/p/w500/1E5baAaEse26fej7uHcjOgEE2t2.jpg',
      Backdrop: 'https://image.tmdb.org/t/p/w1280/w2PMyoyLU22YvrGK3smVM9fW1jj.jpg',
    },
    Etag: 'sbs-etag',
    Tags: ['3D', 'SBS'],
    MediaSources: [
      {
        Id: 'media-source-sbs-001',
        Path: '/media/generic-3d-sbs-demo.mp4',
        Container: 'mp4',
        Name: 'Generic 3D SBS Demo',
        IsRemote: false,
        RunTimeTicks: 4_200_000_0000,
        SupportsDirectStream: true,
        SupportsDirectPlay: true,
        SupportsTranscoding: true,
        MediaStreams: [
          { Index: 0, Type: 'Video', Codec: 'h264', Width: 3840, Height: 1080, IsDefault: true },
          { Index: 1, Type: 'Audio', Codec: 'aac', Channels: 2, IsDefault: true },
        ],
      },
    ],
  },
  {
    Id: 'movie-360-001',
    Name: 'Generic 360 Demo',
    Type: 'Movie',
    MediaType: 'Video',
    Overview: 'A 360-degree fixture for spherical projection testing.',
    RunTimeTicks: 3_600_000_0000,
    UserData: { PlaybackPositionTicks: 0, PlayedPercentage: 0, IsFavorite: false, Played: false },
    ImageTags: { Primary: '360-primary' },
    Artwork: {
      Primary: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
      Backdrop: 'https://image.tmdb.org/t/p/w1280/5BwqwxMEjeFtdknRV792Svo0K1v.jpg',
    },
    Etag: '360-etag',
    Tags: ['360'],
    MediaSources: [
      {
        Id: 'media-source-360-001',
        Path: '/media/generic-360-demo.mp4',
        Container: 'mp4',
        Name: 'Generic 360 Demo',
        IsRemote: false,
        RunTimeTicks: 3_600_000_0000,
        SupportsDirectStream: true,
        SupportsDirectPlay: true,
        SupportsTranscoding: true,
        MediaStreams: [
          { Index: 0, Type: 'Video', Codec: 'h265', Width: 4096, Height: 2048, IsDefault: true },
          { Index: 1, Type: 'Audio', Codec: 'aac', Channels: 2, IsDefault: true },
        ],
      },
    ],
  },
  {
    Id: 'movie-180-001',
    Name: 'Generic 180 Demo',
    Type: 'Movie',
    MediaType: 'Video',
    Overview: 'A 180-degree immersive fixture for half-dome projection testing.',
    RunTimeTicks: 3_000_000_0000,
    UserData: { PlaybackPositionTicks: 0, PlayedPercentage: 0, IsFavorite: false, Played: false },
    ImageTags: { Primary: '180-primary' },
    Artwork: {
      Primary: 'https://image.tmdb.org/t/p/w500/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg',
      Backdrop: 'https://image.tmdb.org/t/p/w1280/6ELCZlTA5lGUops70hKdB83WJxH.jpg',
    },
    Etag: '180-etag',
    Tags: ['180', 'VR'],
    MediaSources: [
      {
        Id: 'media-source-180-001',
        Path: '/media/generic-180-demo.mp4',
        Container: 'mp4',
        Name: 'Generic 180 Demo',
        IsRemote: false,
        RunTimeTicks: 3_000_000_0000,
        SupportsDirectStream: true,
        SupportsDirectPlay: true,
        SupportsTranscoding: true,
        MediaStreams: [
          { Index: 0, Type: 'Video', Codec: 'h264', Width: 3840, Height: 1920, IsDefault: true },
          { Index: 1, Type: 'Audio', Codec: 'aac', Channels: 2, IsDefault: true },
        ],
      },
    ],
  },
  {
    Id: 'movie-fisheye-001',
    Name: 'Generic Fisheye Demo',
    Type: 'Movie',
    MediaType: 'Video',
    Overview: 'A fisheye immersive fixture for source-correction UI and projection experiments.',
    RunTimeTicks: 2_700_000_0000,
    UserData: { PlaybackPositionTicks: 450_000_0000, PlayedPercentage: 16.67, IsFavorite: true, Played: false },
    ImageTags: { Primary: 'fisheye-primary' },
    Artwork: {
      Primary: 'https://image.tmdb.org/t/p/w500/kqjL17yufvn9OVLyXYpvtyrFfak.jpg',
      Backdrop: 'https://image.tmdb.org/t/p/w1280/5hNcsnMkwU2LknLoru73c76el3z.jpg',
    },
    Etag: 'fisheye-etag',
    Tags: ['Fisheye', 'VR'],
    MediaSources: [
      {
        Id: 'media-source-fisheye-001',
        Path: '/media/generic-fisheye-demo.mp4',
        Container: 'mp4',
        Name: 'Generic Fisheye Demo',
        IsRemote: false,
        RunTimeTicks: 2_700_000_0000,
        SupportsDirectStream: true,
        SupportsDirectPlay: true,
        SupportsTranscoding: true,
        MediaStreams: [
          { Index: 0, Type: 'Video', Codec: 'h264', Width: 1920, Height: 1920, IsDefault: true },
          { Index: 1, Type: 'Audio', Codec: 'aac', Channels: 2, IsDefault: true },
        ],
      },
    ],
  },
  {
    Id: 'movie-transcode-001',
    Name: 'Generic Transcode Fallback Demo',
    Type: 'Movie',
    MediaType: 'Video',
    Overview: 'An intentionally awkward codec/container fixture for transcoding fallback tests.',
    RunTimeTicks: 7_200_000_0000,
    ProductionYear: 2026,
    UserData: { PlaybackPositionTicks: 0, PlayedPercentage: 0, IsFavorite: false, Played: false },
    ImageTags: { Primary: 'transcode-primary' },
    Artwork: {
      Primary: 'https://image.tmdb.org/t/p/w500/y95lQLnuNKdPAzw9F9Ab8kJ80c3.jpg',
      Backdrop: 'https://image.tmdb.org/t/p/w1280/8YFL5QQVPy3AgrEQxNYVSgiPEbe.jpg',
    },
    Etag: 'transcode-etag',
    Tags: ['Transcode', 'Unsupported'],
    MediaSources: [
      {
        Id: 'media-source-transcode-001',
        Path: '/media/generic-transcode-fallback-demo.mkv',
        Container: 'mkv',
        Name: 'Generic Transcode Fallback Demo',
        IsRemote: false,
        RunTimeTicks: 7_200_000_0000,
        SupportsDirectStream: false,
        SupportsDirectPlay: false,
        SupportsTranscoding: true,
        TranscodingUrl: '/Videos/movie-transcode-001/master.m3u8',
        MediaStreams: [
          { Index: 0, Type: 'Video', Codec: 'vp9', Width: 3840, Height: 2160, IsDefault: true },
          { Index: 1, Type: 'Audio', Codec: 'flac', Channels: 6, IsDefault: true },
        ],
      },
    ],
  },
  {
    Id: 'series-generic-sample-001',
    Name: 'Generic Sample Series',
    Type: 'Series',
    MediaType: 'Video',
    Overview: 'A sample show fixture for series, season, and episode browsing.',
    RunTimeTicks: 2_400_000_0000,
    ProductionYear: 2026,
    UserData: { PlaybackPositionTicks: 0, PlayedPercentage: 0, IsFavorite: false, Played: false },
    ImageTags: { Primary: 'sample-series-primary' },
    Artwork: {
      Primary: 'https://image.tmdb.org/t/p/w500/h1B7tW0t399VDjAcWJh8m87469b.jpg',
      Backdrop: 'https://image.tmdb.org/t/p/w1280/4HWAQu28e2yaWrtupFPGFkdNU7V.jpg',
    },
    Etag: 'sample-series-etag',
    Tags: ['Series'],
    MediaSources: [],
  },
  {
    Id: 'episode-spacewalk-001',
    Name: 'Spacewalk Pilot',
    Type: 'Episode',
    MediaType: 'Video',
    SeriesId: 'series-generic-sample-001',
    ParentId: 'series-generic-sample-001',
    SeriesName: 'Generic Sample Series',
    SeasonName: 'Season 1',
    IndexNumber: 1,
    ParentIndexNumber: 1,
    Overview: 'A sample episode fixture so catalog rows can exercise mixed movie and episode cards.',
    RunTimeTicks: 2_400_000_0000,
    UserData: { PlaybackPositionTicks: 2_400_000_0000, PlayedPercentage: 100, IsFavorite: false, Played: true },
    ImageTags: { Primary: 'spacewalk-primary' },
    Artwork: {
      Primary: 'https://image.tmdb.org/t/p/w500/h1B7tW0t399VDjAcWJh8m87469b.jpg',
      Backdrop: 'https://image.tmdb.org/t/p/w1280/4HWAQu28e2yaWrtupFPGFkdNU7V.jpg',
    },
    Etag: 'spacewalk-etag',
    Tags: ['Episode', 'Watched'],
    MediaSources: [
      {
        Id: 'media-source-spacewalk-001',
        Path: '/media/generic-spacewalk-pilot.mp4',
        Container: 'mp4',
        Name: 'Spacewalk Pilot',
        IsRemote: false,
        RunTimeTicks: 2_400_000_0000,
        SupportsDirectStream: true,
        SupportsDirectPlay: true,
        SupportsTranscoding: true,
        MediaStreams: [
          { Index: 0, Type: 'Video', Codec: 'h264', Width: 1280, Height: 720, IsDefault: true },
          { Index: 1, Type: 'Audio', Codec: 'aac', Channels: 2, IsDefault: true },
        ],
      },
    ],
  },
];


function jsonResponse(c, payload, status = 200) {
  return c.json(payload, status);
}

function getBaseUrl(c) {
  const url = new URL(c.req.url);
  return `${url.protocol}//${url.host}`;
}

function findItem(itemId) {
  return mediaItems.find((item) => item.Id === itemId);
}

function queryAny(c, ...names) {
  for (const name of names) {
    const value = c.req.query(name);
    if (value !== undefined) return value;
  }
  return undefined;
}

function isVrItem(item) {
  return item.Tags?.some((tag) => ['3D', 'SBS', '180', '360', 'Fisheye', 'VR'].includes(tag));
}

function includeTypesFor(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((type) => type.trim())
    .filter(Boolean);
}

function paginateItems(items, startIndex, limit) {
  const safeStart = Number.isFinite(startIndex) && startIndex > 0 ? startIndex : 0;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : items.length;
  return items.slice(safeStart, safeStart + safeLimit);
}

function authHeader(token = ACCESS_TOKEN) {
  return `MediaBrowser Client="Generic Emulator", Device="Generic Device", DeviceId="${DEVICE_ID}", Version="0.1.0", Token="${token}"`;
}

export const plugin = {
  name: 'piratebay',
  register(app, store) {
    app.get('/System/Info/Public', (c) => jsonResponse(c, {
      LocalAddress: getBaseUrl(c),
      ServerName: 'Generic Media Emulator',
      Version: '10.9.0-emulator',
      ProductName: 'Generic Media Server',
      Id: SERVER_ID,
    }));

    app.post('/Users/AuthenticateByName', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      store.setData('piratebay:last-authenticate', body);

      if (!body.Username || !body.Pw || body.Pw === 'bad-password') {
        return jsonResponse(c, { Message: 'Invalid username or password' }, 401);
      }

      return jsonResponse(c, {
        User: {
          Id: USER_ID,
          Name: body.Username,
          ServerId: SERVER_ID,
          HasPassword: true,
          HasConfiguredPassword: true,
          HasConfiguredEasyPassword: false,
        },
        SessionInfo: {
          DeviceId: DEVICE_ID,
          DeviceName: 'Generic Device',
          Client: 'Generic',
          LastActivityDate: new Date().toISOString(),
        },
        AccessToken: ACCESS_TOKEN,
        ServerId: SERVER_ID,
      });
    });

    app.get('/Users/Public', (c) => jsonResponse(c, [
      {
        Id: USER_ID,
        Name: 'generic',
        ServerId: SERVER_ID,
        HasPassword: true,
        HasConfiguredPassword: true,
        HasConfiguredEasyPassword: false,
      },
    ]));

    app.get('/Users/:userId/Views', (c) => jsonResponse(c, {
      Items: [
        { Id: 'library-movies-001', Name: 'Movies', Type: 'CollectionFolder', CollectionType: 'movies' },
        { Id: 'library-tv-001', Name: 'TV Shows', Type: 'CollectionFolder', CollectionType: 'tvshows' },
        { Id: 'library-vr-001', Name: 'VR Videos', Type: 'CollectionFolder', CollectionType: 'homevideos' },
        { Id: 'library-channels-001', Name: 'Live TV', Type: 'CollectionFolder', CollectionType: 'livetv' },
      ],
      TotalRecordCount: 4,
      StartIndex: 0,
    }));

    app.get('/Users/:userId/Items', (c) => {
      const searchTerm = queryAny(c, 'searchTerm', 'SearchTerm')?.toLowerCase();
      const parentId = queryAny(c, 'ParentId', 'parentId');
      const includeTypes = includeTypesFor(queryAny(c, 'IncludeItemTypes', 'includeItemTypes'));
      const startIndex = Number(queryAny(c, 'StartIndex', 'startIndex') ?? 0);
      const limit = Number(queryAny(c, 'Limit', 'limit') ?? 100);
      const items = mediaItems.filter((item) => {
        if (includeTypes.length > 0 && !includeTypes.includes(item.Type)) return false;
        if (searchTerm && !item.Name.toLowerCase().includes(searchTerm)) return false;
        if (parentId && mediaItems.some((candidate) => candidate.Id === parentId && candidate.Type === 'Series')) {
          return item.ParentId === parentId || item.SeriesId === parentId;
        }
        if (parentId === 'library-tv-001') return item.Type === 'Series';
        if (parentId === 'library-vr-001') return isVrItem(item);
        if (parentId === 'library-channels-001') return item.Type === 'LiveTvChannel';
        if (parentId === 'library-movies-001') return item.Type === 'Movie' && !isVrItem(item);
        return true;
      });
      const page = paginateItems(items, startIndex, limit);

      return jsonResponse(c, { Items: page, TotalRecordCount: items.length, StartIndex: startIndex });
    });

    app.get('/Users/:userId/Items/Latest', (c) => {
      const parentId = queryAny(c, 'ParentId', 'parentId');
      const limit = Number(queryAny(c, 'Limit', 'limit') ?? 20);
      const items = mediaItems
        .filter((item) => {
          if (parentId === 'library-vr-001') return isVrItem(item);
          if (parentId === 'library-channels-001') return item.Type === 'LiveTvChannel';
          if (parentId === 'library-movies-001') return !isVrItem(item) && item.Type !== 'LiveTvChannel';
          return true;
        })
        .slice(-limit)
        .reverse();
      return jsonResponse(c, { Items: items, TotalRecordCount: items.length, StartIndex: 0 });
    });

    app.get('/Users/:userId/Items/Resume', (c) => {
      const startIndex = Number(queryAny(c, 'StartIndex', 'startIndex') ?? 0);
      const limit = Number(queryAny(c, 'Limit', 'limit') ?? 100);
      const items = mediaItems.filter((item) => item.UserData?.PlaybackPositionTicks > 0);
      return jsonResponse(c, { Items: paginateItems(items, startIndex, limit), TotalRecordCount: items.length, StartIndex: startIndex });
    });

    app.post('/Users/:userId/FavoriteItems/:itemId', (c) => {
      const item = findItem(c.req.param('itemId'));
      if (!item) return jsonResponse(c, { Message: 'Item not found' }, 404);
      item.UserData = { ...(item.UserData ?? {}), IsFavorite: true };
      store.setData('piratebay:last-favorite', { itemId: item.Id, favorite: true });
      return jsonResponse(c, {});
    });

    app.delete('/Users/:userId/FavoriteItems/:itemId', (c) => {
      const item = findItem(c.req.param('itemId'));
      if (!item) return jsonResponse(c, { Message: 'Item not found' }, 404);
      item.UserData = { ...(item.UserData ?? {}), IsFavorite: false };
      store.setData('piratebay:last-favorite', { itemId: item.Id, favorite: false });
      return jsonResponse(c, {});
    });

    app.get('/Users/:userId/Items/:itemId', (c) => {
      const item = findItem(c.req.param('itemId'));
      if (!item) return jsonResponse(c, { Message: 'Item not found' }, 404);
      return jsonResponse(c, item);
    });

    app.get('/Search/Hints', (c) => {
      const term = queryAny(c, 'searchTerm', 'SearchTerm')?.toLowerCase() ?? '';
      const matches = mediaItems.filter((item) => item.Name.toLowerCase().includes(term));
      return jsonResponse(c, {
        SearchHints: matches.map((item) => ({
          ItemId: item.Id,
          Id: item.Id,
          Name: item.Name,
          Type: item.Type,
          MediaType: item.MediaType,
          PrimaryImageTag: item.ImageTags?.Primary,
        })),
        TotalRecordCount: matches.length,
      });
    });

    app.post('/Items/:itemId/PlaybackInfo', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const item = findItem(c.req.param('itemId'));
      store.setData('piratebay:last-playback-info', { itemId: c.req.param('itemId'), body });

      if (!item) return jsonResponse(c, { Message: 'Item not found' }, 404);

      return jsonResponse(c, {
        MediaSources: item.MediaSources,
        PlaySessionId: `play-session-${item.Id}`,
        ErrorCode: null,
      });
    });

    app.get('/Videos/:itemId/stream', (c) => {
      const item = findItem(c.req.param('itemId'));
      if (!item) return new Response('Item not found', { status: 404 });

      if (item.EmulatorStreamUrl) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: item.EmulatorStreamUrl,
            'X-Emulator-Authorization': authHeader(),
          },
        });
      }

      return new Response(`generic-media-emulator-stream:${item.Id}`, {
        headers: {
          'Content-Type': 'video/mp4',
          'X-Emulator-Authorization': authHeader(),
        },
      });
    });

    app.post('/Sessions/Playing', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      store.setData('piratebay:last-playing', body);
      return jsonResponse(c, {});
    });

    app.post('/Sessions/Playing/Progress', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      store.setData('piratebay:last-progress', body);
      return jsonResponse(c, {});
    });

    app.post('/Sessions/Playing/Stopped', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      store.setData('piratebay:last-stopped', body);
      return jsonResponse(c, {});
    });

    app.get('/Items/:itemId/Images/:imageType', async (c) => {
      const item = findItem(c.req.param('itemId'));
      if (!item) return new Response('Item not found', { status: 404 });
      const imageType = c.req.param('imageType');
      const width = c.req.query('maxWidth') ?? c.req.query('fillWidth') ?? (imageType === 'Primary' ? '600' : '1280');
      const height = c.req.query('maxHeight') ?? c.req.query('fillHeight') ?? (imageType === 'Primary' ? '900' : '720');
      const artworkUrl = item.Artwork?.[imageType] ?? item.Artwork?.Primary;
      const fallbackUrl = `https://placehold.co/${width}x${height}/151827/ffffff.jpg?text=${encodeURIComponent(item.Name)}`;
      if (artworkUrl && existsSync(artworkUrl)) {
        return new Response(readFileSync(artworkUrl), {
          headers: {
            'Content-Type': contentTypeForImagePath(artworkUrl),
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
      const response = await fetch(artworkUrl ?? fallbackUrl);
      return new Response(await response.arrayBuffer(), {
        headers: {
          'Content-Type': response.headers.get('content-type') ?? 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    });

    app.get('/inspect/last-authenticate', (c) => c.json(store.getData('piratebay:last-authenticate') ?? null));
    app.get('/inspect/last-playback-info', (c) => c.json(store.getData('piratebay:last-playback-info') ?? null));
    app.get('/inspect/last-playing', (c) => c.json(store.getData('piratebay:last-playing') ?? null));
    app.get('/inspect/last-progress', (c) => c.json(store.getData('piratebay:last-progress') ?? null));
    app.get('/inspect/last-stopped', (c) => c.json(store.getData('piratebay:last-stopped') ?? null));
  },
};

function contentTypeForImagePath(path) {
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

export const label = 'Pirate Bay API emulator';
export const endpoints = 'auth, public users, libraries, items, search, playback info, stream, playback reporting';
export const initConfig = { piratebay: {} };
