function now() {
  return new Date().toISOString();
}

function initialState(config = {}) {
  const channel = config.channel ?? {
    id: 'UC_emulator_creator',
    snippet: {
      title: 'API Emulator Creator',
      description: 'Seed channel for YouTube CLI smoke tests',
      customUrl: '@apiemulator',
      publishedAt: '2026-01-01T00:00:00Z',
    },
    statistics: {
      viewCount: '123456',
      subscriberCount: '4200',
      hiddenSubscriberCount: false,
      videoCount: '2',
    },
    contentDetails: {
      relatedPlaylists: {
        uploads: 'UU_emulator_creator_uploads',
      },
    },
  };
  const video = config.video ?? {
    id: 'video_cli_seed',
    snippet: {
      channelId: channel.id,
      title: 'YouTube CLI Seed Video',
      description: 'Seed video for local emulator CLI tests',
      channelTitle: channel.snippet.title,
      categoryId: '22',
      publishedAt: '2026-05-15T00:00:00Z',
      tags: ['emulator', 'cli'],
    },
    statistics: {
      viewCount: '9876',
      likeCount: '321',
      commentCount: '7',
    },
    contentDetails: {
      duration: 'PT3M21S',
      dimension: '2d',
      definition: 'hd',
      caption: 'false',
      licensedContent: false,
    },
    status: {
      privacyStatus: 'private',
      uploadStatus: 'processed',
    },
  };
  const playlist = config.playlist ?? {
    id: 'PL_emulator_creator',
    snippet: {
      channelId: channel.id,
      title: 'CLI Smoke Playlist',
      description: 'Seed playlist for local emulator CLI tests',
      channelTitle: channel.snippet.title,
      publishedAt: '2026-05-15T00:00:00Z',
    },
    contentDetails: {
      itemCount: 1,
    },
    status: {
      privacyStatus: 'private',
    },
  };
  return {
    channels: config.channels ?? [channel],
    videos: config.videos ?? [video],
    playlists: config.playlists ?? [playlist],
    playlistItems: config.playlistItems ?? [{
      id: 'PLI_cli_seed',
      snippet: {
        playlistId: playlist.id,
        channelId: channel.id,
        title: video.snippet.title,
        description: video.snippet.description,
        position: 0,
        resourceId: {
          kind: 'youtube#video',
          videoId: video.id,
        },
      },
      contentDetails: {
        videoId: video.id,
        videoPublishedAt: video.snippet.publishedAt,
      },
    }],
    comments: config.comments ?? [{
      id: 'comment_cli_seed',
      snippet: {
        textDisplay: 'Seed comment from emulator',
        textOriginal: 'Seed comment from emulator',
        authorDisplayName: 'Emulator Viewer',
        videoId: video.id,
        parentId: 'thread_cli_seed',
        likeCount: 1,
        publishedAt: '2026-05-15T00:00:00Z',
        updatedAt: '2026-05-15T00:00:00Z',
      },
    }],
    commentThreads: config.commentThreads ?? [{
      id: 'thread_cli_seed',
      snippet: {
        channelId: channel.id,
        videoId: video.id,
        topLevelComment: {
          kind: 'youtube#comment',
          etag: 'etag_comment_cli_seed',
          id: 'comment_cli_seed',
          snippet: {
            textDisplay: 'Seed comment from emulator',
            textOriginal: 'Seed comment from emulator',
            authorDisplayName: 'Emulator Viewer',
            videoId: video.id,
            likeCount: 1,
            publishedAt: '2026-05-15T00:00:00Z',
            updatedAt: '2026-05-15T00:00:00Z',
          },
        },
        totalReplyCount: 0,
        canReply: true,
      },
    }],
    groups: config.groups ?? [{
      id: 'group_cli_seed',
      snippet: {
        title: 'CLI Smoke Group',
        publishedAt: '2026-05-15T00:00:00Z',
      },
      contentDetails: {
        itemCount: '1',
      },
    }],
    groupItems: config.groupItems ?? [{
      id: 'group_item_cli_seed',
      groupId: 'group_cli_seed',
      resource: {
        kind: 'youtube#video',
        id: video.id,
      },
    }],
    reports: config.reports ?? [{
      columnHeaders: [
        { name: 'day', columnType: 'DIMENSION', dataType: 'STRING' },
        { name: 'views', columnType: 'METRIC', dataType: 'INTEGER' },
        { name: 'likes', columnType: 'METRIC', dataType: 'INTEGER' },
      ],
      rows: [['2026-05-15', 1234, 56]],
    }],
    uploads: config.uploads ?? [],
    nextVideoId: 2,
    nextPlaylistId: 2,
    nextPlaylistItemId: 2,
    nextCommentId: 2,
  };
}

function state(store) {
  const current = store.getData?.('youtube:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('youtube:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('youtube:state', next);
}

function item(kind, row) {
  return {
    kind: `youtube#${kind}`,
    etag: `etag_${row.id}`,
    ...row,
  };
}

function list(kind, rows, maxResults = 50) {
  const items = rows.slice(0, Number(maxResults) || 50).map((row) => item(kind, row));
  return {
    kind: `youtube#${kind}ListResponse`,
    etag: `etag_${kind}_list`,
    pageInfo: {
      totalResults: items.length,
      resultsPerPage: items.length,
    },
    items,
  };
}

function ids(value) {
  return (value ?? '').split(',').map((id) => id.trim()).filter(Boolean);
}

function byIds(rows, value) {
  const wanted = ids(value);
  return wanted.length ? rows.filter((row) => wanted.includes(row.id)) : rows;
}

function googleError(c, message, status = 400) {
  return c.json({ error: { code: status, message, errors: [{ message, domain: 'youtube', reason: 'badRequest' }] } }, status);
}

function createdVideo(s, body = {}) {
  const id = body.id ?? `video_cli_upload_${s.nextVideoId++}`;
  return {
    id,
    snippet: {
      channelId: s.channels[0].id,
      title: body.snippet?.title ?? 'Uploaded Emulator Video',
      description: body.snippet?.description ?? '',
      channelTitle: s.channels[0].snippet.title,
      categoryId: body.snippet?.categoryId ?? '22',
      publishedAt: now(),
      tags: body.snippet?.tags ?? [],
    },
    statistics: {
      viewCount: '0',
      likeCount: '0',
      commentCount: '0',
    },
    contentDetails: {
      duration: 'PT0S',
      dimension: '2d',
      definition: 'hd',
      caption: 'false',
      licensedContent: false,
    },
    status: {
      privacyStatus: body.status?.privacyStatus ?? 'private',
      uploadStatus: 'processed',
    },
  };
}

export const contract = {
  provider: 'youtube',
  source: 'YouTube Data API v3, Upload API, and Analytics API v2 CLI-compatible subset',
  docs: 'https://developers.google.com/youtube',
  scope: ['data-api', 'upload-api', 'analytics-api', 'channels', 'videos', 'playlists', 'comments', 'reports', 'groups'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'youtube',
  register(app, store) {
    app.post('/token', (c) => c.json({ access_token: 'youtube_emulator_access_token', token_type: 'Bearer', expires_in: 3600 }));
    app.post('/oauth2/v4/token', (c) => c.json({ access_token: 'youtube_emulator_access_token', token_type: 'Bearer', expires_in: 3600 }));

    app.get('/youtube/v3/search', (c) => {
      const s = state(store);
      const q = c.req.query('q') ?? '';
      const types = (c.req.query('type') ?? 'video,channel,playlist').split(',');
      const items = [];
      if (types.includes('video')) {
        for (const video of s.videos) {
          items.push({
            kind: 'youtube#searchResult',
            etag: `etag_search_${video.id}`,
            id: { kind: 'youtube#video', videoId: video.id },
            snippet: { ...video.snippet, title: q ? `${video.snippet.title} (${q})` : video.snippet.title },
          });
        }
      }
      if (types.includes('channel')) {
        for (const channel of s.channels) items.push({ kind: 'youtube#searchResult', etag: `etag_search_${channel.id}`, id: { kind: 'youtube#channel', channelId: channel.id }, snippet: channel.snippet });
      }
      if (types.includes('playlist')) {
        for (const playlist of s.playlists) items.push({ kind: 'youtube#searchResult', etag: `etag_search_${playlist.id}`, id: { kind: 'youtube#playlist', playlistId: playlist.id }, snippet: playlist.snippet });
      }
      return c.json({ kind: 'youtube#searchListResponse', etag: 'etag_search_list', pageInfo: { totalResults: items.length, resultsPerPage: items.length }, items });
    });

    app.get('/youtube/v3/channels', (c) => c.json(list('channel', c.req.query('mine') === 'true' ? state(store).channels.slice(0, 1) : byIds(state(store).channels, c.req.query('id')), c.req.query('maxResults'))));
    app.get('/youtube/v3/videos', (c) => c.json(list('video', byIds(state(store).videos, c.req.query('id')), c.req.query('maxResults'))));
    app.get('/youtube/v3/playlists', (c) => {
      const s = state(store);
      const channelId = c.req.query('channelId');
      let rows = byIds(s.playlists, c.req.query('id'));
      if (channelId) rows = rows.filter((row) => row.snippet.channelId === channelId);
      return c.json(list('playlist', rows, c.req.query('maxResults')));
    });
    app.post('/youtube/v3/playlists', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const playlist = {
        id: `PL_cli_created_${s.nextPlaylistId++}`,
        snippet: {
          channelId: s.channels[0].id,
          title: body.snippet?.title ?? 'Emulator Playlist',
          description: body.snippet?.description ?? '',
          channelTitle: s.channels[0].snippet.title,
          publishedAt: now(),
        },
        contentDetails: { itemCount: 0 },
        status: { privacyStatus: body.status?.privacyStatus ?? 'private' },
      };
      s.playlists.push(playlist);
      saveState(store, s);
      return c.json(item('playlist', playlist), 200);
    });
    app.put('/youtube/v3/playlists', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const playlist = s.playlists.find((row) => row.id === body.id);
      if (!playlist) return googleError(c, 'Playlist not found', 404);
      playlist.snippet = { ...playlist.snippet, ...body.snippet };
      playlist.status = { ...playlist.status, ...body.status };
      saveState(store, s);
      return c.json(item('playlist', playlist));
    });
    app.delete('/youtube/v3/playlists', (c) => {
      const s = state(store);
      s.playlists = s.playlists.filter((row) => row.id !== c.req.query('id'));
      saveState(store, s);
      return c.body ? c.body(null, 204) : c.json({}, 204);
    });

    app.get('/youtube/v3/playlistItems', (c) => {
      const s = state(store);
      const playlistId = c.req.query('playlistId');
      const videoId = c.req.query('videoId');
      let rows = byIds(s.playlistItems, c.req.query('id'));
      if (playlistId) rows = rows.filter((row) => row.snippet.playlistId === playlistId);
      if (videoId) rows = rows.filter((row) => row.contentDetails.videoId === videoId);
      return c.json(list('playlistItem', rows, c.req.query('maxResults')));
    });
    app.post('/youtube/v3/playlistItems', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const playlistItem = {
        id: `PLI_cli_created_${s.nextPlaylistItemId++}`,
        snippet: {
          playlistId: body.snippet?.playlistId,
          channelId: s.channels[0].id,
          title: s.videos.find((video) => video.id === body.snippet?.resourceId?.videoId)?.snippet.title ?? 'Playlist Item',
          position: body.snippet?.position ?? 0,
          resourceId: body.snippet?.resourceId,
        },
        contentDetails: {
          videoId: body.snippet?.resourceId?.videoId,
          videoPublishedAt: now(),
        },
      };
      s.playlistItems.push(playlistItem);
      saveState(store, s);
      return c.json(item('playlistItem', playlistItem), 200);
    });
    app.put('/youtube/v3/playlistItems', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const playlistItem = s.playlistItems.find((row) => row.id === body.id);
      if (!playlistItem) return googleError(c, 'Playlist item not found', 404);
      playlistItem.snippet = { ...playlistItem.snippet, ...body.snippet };
      saveState(store, s);
      return c.json(item('playlistItem', playlistItem));
    });
    app.delete('/youtube/v3/playlistItems', (c) => {
      const s = state(store);
      s.playlistItems = s.playlistItems.filter((row) => row.id !== c.req.query('id'));
      saveState(store, s);
      return c.body ? c.body(null, 204) : c.json({}, 204);
    });

    app.post('/youtube/v3/videos', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const video = createdVideo(s, body);
      s.videos.push(video);
      saveState(store, s);
      return c.json(item('video', video), 200);
    });
    app.put('/youtube/v3/videos', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const video = s.videos.find((row) => row.id === body.id);
      if (!video) return googleError(c, 'Video not found', 404);
      video.snippet = { ...video.snippet, ...body.snippet };
      video.status = { ...video.status, ...body.status };
      saveState(store, s);
      return c.json(item('video', video));
    });
    app.delete('/youtube/v3/videos', (c) => {
      const s = state(store);
      s.videos = s.videos.filter((row) => row.id !== c.req.query('id'));
      saveState(store, s);
      return c.body ? c.body(null, 204) : c.json({}, 204);
    });
    app.post('/youtube/v3/videos/rate', (c) => c.body ? c.body(null, 204) : c.json({}, 204));
    app.get('/youtube/v3/videos/getRating', (c) => c.json({ kind: 'youtube#videoGetRatingResponse', items: ids(c.req.query('id')).map((videoId) => ({ videoId, rating: 'like' })) }));
    app.post('/youtube/v3/videos/reportAbuse', (c) => c.body ? c.body(null, 204) : c.json({}, 204));
    app.post('/upload/youtube/v3/videos', async (c) => {
      const s = state(store);
      await c.req.text?.();
      const video = createdVideo(s, { snippet: { title: 'Uploaded Emulator Video' } });
      s.videos.push(video);
      s.uploads.push({ id: video.id, createdAt: now() });
      saveState(store, s);
      return c.json(item('video', video), 200);
    });

    app.get('/youtube/v3/commentThreads', (c) => c.json(list('commentThread', state(store).commentThreads, c.req.query('maxResults'))));
    app.post('/youtube/v3/commentThreads', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const commentId = `comment_cli_created_${s.nextCommentId++}`;
      const thread = {
        id: `thread_cli_created_${s.nextCommentId++}`,
        snippet: {
          channelId: s.channels[0].id,
          videoId: body.snippet?.videoId,
          topLevelComment: {
            kind: 'youtube#comment',
            etag: `etag_${commentId}`,
            id: commentId,
            snippet: body.snippet?.topLevelComment?.snippet ?? {},
          },
          totalReplyCount: 0,
          canReply: true,
        },
      };
      s.commentThreads.push(thread);
      saveState(store, s);
      return c.json(item('commentThread', thread), 200);
    });
    app.get('/youtube/v3/comments', (c) => c.json(list('comment', byIds(state(store).comments, c.req.query('id')), c.req.query('maxResults'))));
    app.post('/youtube/v3/comments', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const comment = { id: `comment_cli_created_${s.nextCommentId++}`, snippet: { ...body.snippet, publishedAt: now(), updatedAt: now() } };
      s.comments.push(comment);
      saveState(store, s);
      return c.json(item('comment', comment), 200);
    });
    app.put('/youtube/v3/comments', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const comment = s.comments.find((row) => row.id === body.id);
      if (!comment) return googleError(c, 'Comment not found', 404);
      comment.snippet = { ...comment.snippet, ...body.snippet, updatedAt: now() };
      saveState(store, s);
      return c.json(item('comment', comment));
    });
    app.delete('/youtube/v3/comments', (c) => {
      const s = state(store);
      s.comments = s.comments.filter((row) => row.id !== c.req.query('id'));
      saveState(store, s);
      return c.body ? c.body(null, 204) : c.json({}, 204);
    });

    app.get('/youtube/v3/i18nLanguages', (c) => c.json(list('i18nLanguage', [{ id: 'en', snippet: { hl: 'en', name: 'English' } }])));
    app.get('/youtube/v3/i18nRegions', (c) => c.json(list('i18nRegion', [{ id: 'US', snippet: { gl: 'US', name: 'United States' } }])));
    app.get('/youtube/v3/videoCategories', (c) => c.json(list('videoCategory', [{ id: '22', snippet: { channelId: 'UCBR8-60-B28hp2BmDPdntcQ', title: 'People & Blogs', assignable: true } }])));
    app.get('/youtube/v3/videoAbuseReportReasons', (c) => c.json(list('videoAbuseReportReason', [{ id: 'V', snippet: { label: 'Violent or repulsive content' } }])));

    app.get('/v2/reports', (c) => c.json(state(store).reports[0]));
    app.get('/v2/groups', (c) => c.json(list('group', byIds(state(store).groups, c.req.query('id')))));
    app.get('/v2/groupItems', (c) => {
      const groupId = c.req.query('groupId');
      const rows = state(store).groupItems.filter((row) => !groupId || row.groupId === groupId);
      return c.json(list('groupItem', rows));
    });

    app.get('/youtube/inspect/contract', (c) => c.json(contract));
    app.get('/youtube/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'YouTube API emulator';
export const endpoints = 'YouTube Data API v3, Upload API, and Analytics API v2';
export const capabilities = contract.scope;
export const initConfig = { youtube: initialState() };
export default plugin;
