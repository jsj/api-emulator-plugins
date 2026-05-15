function now() {
  return new Date().toISOString();
}

function initialState(config = {}) {
  const channels = config.channels ?? [
    { id: 'sxm_001', channelNumber: '2', name: 'Emulator Hits 1', shortName: 'Hits 1', category: 'Pop', siriusChannelNumber: '2', xmChannelNumber: '2', streamUrl: 'https://siriusxm.local/streams/sxm_001.m3u8' },
    { id: 'sxm_002', channelNumber: '36', name: 'Localhost Chill', shortName: 'Chill', category: 'Electronic', siriusChannelNumber: '36', xmChannelNumber: '36', streamUrl: 'https://siriusxm.local/streams/sxm_002.m3u8' },
  ];
  const plays = config.plays ?? [
    { id: 'play_sxm_001', channelId: 'sxm_001', title: 'Satellite Mock', artist: 'SXM Emulator', album: 'Radio Fixtures', startedAt: '2026-05-15T12:00:00.000Z', duration: 210 },
    { id: 'play_sxm_002', channelId: 'sxm_002', title: 'Channel Lineup', artist: 'Localhost DJ', album: 'Radio Fixtures', startedAt: '2026-05-15T12:03:30.000Z', duration: 188 },
  ];
  return {
    profile: config.profile ?? { id: 'sxm_user_seed', username: 'emulator@siriusxm.local', subscriptionStatus: 'active' },
    channels,
    plays,
    favorites: config.favorites ?? ['sxm_001'],
  };
}

function state(store) {
  const current = store.getData?.('siriusxm:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('siriusxm:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('siriusxm:state', next);
}

function hit(store, surface) {
  const hits = store.getData?.('siriusxm:hits') ?? [];
  hits.push({ surface, at: now() });
  store.setData?.('siriusxm:hits', hits);
}

function error(message, status = 404) {
  return { error: { code: status, message } };
}

function findChannel(s, id) {
  return s.channels.find((channel) => channel.id === id || channel.channelNumber === id || channel.shortName.toLowerCase() === String(id).toLowerCase());
}

function page(items, limit = items.length, offset = 0) {
  const safeLimit = Number(limit) || items.length;
  const safeOffset = Number(offset) || 0;
  return { data: items.slice(safeOffset, safeOffset + safeLimit), paging: { limit: safeLimit, offset: safeOffset, total: items.length } };
}

export const contract = {
  provider: 'siriusxm',
  source: 'SiriusXM channel lineup plus xmplaylist-compatible playback metadata subset',
  docs: 'https://www.siriusxm.com/channels and https://xmplaylist.com/docs',
  scope: ['profile', 'channels', 'channel-detail', 'now-playing', 'recent-tracks', 'favorites'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'siriusxm',
  register(app, store) {
    app.get('/v1/me', (c) => {
      hit(store, 'me');
      return c.json(state(store).profile);
    });

    app.get('/v1/channels', (c) => {
      hit(store, 'channels.list');
      const s = state(store);
      const category = c.req.query('category')?.toLowerCase();
      const term = c.req.query('q')?.toLowerCase();
      const channels = s.channels.filter((channel) => (!category || channel.category.toLowerCase() === category) && (!term || channel.name.toLowerCase().includes(term) || channel.shortName.toLowerCase().includes(term)));
      return c.json(page(channels, c.req.query('limit'), c.req.query('offset')));
    });

    app.get('/v1/channels/:id', (c) => {
      const channel = findChannel(state(store), c.req.param('id'));
      return channel ? c.json({ data: channel }) : c.json(error('Channel not found'), 404);
    });

    app.get('/v1/channels/:id/now-playing', (c) => {
      hit(store, 'channels.now-playing');
      const s = state(store);
      const channel = findChannel(s, c.req.param('id'));
      if (!channel) return c.json(error('Channel not found'), 404);
      const play = s.plays.find((item) => item.channelId === channel.id);
      return c.json({ data: { channel, track: play ?? null, generatedAt: now() } });
    });

    app.get('/v1/channels/:id/tracks', (c) => {
      const s = state(store);
      const channel = findChannel(s, c.req.param('id'));
      if (!channel) return c.json(error('Channel not found'), 404);
      return c.json(page(s.plays.filter((play) => play.channelId === channel.id), c.req.query('limit'), c.req.query('offset')));
    });

    app.get('/v1/me/favorites/channels', (c) => {
      const s = state(store);
      const favorites = s.channels.filter((channel) => s.favorites.includes(channel.id));
      return c.json({ data: favorites });
    });

    app.put('/v1/me/favorites/channels/:id', (c) => {
      const s = state(store);
      const channel = findChannel(s, c.req.param('id'));
      if (!channel) return c.json(error('Channel not found'), 404);
      if (!s.favorites.includes(channel.id)) s.favorites.push(channel.id);
      saveState(store, s);
      return c.json({ data: { channelId: channel.id, favorite: true } });
    });

    app.delete('/v1/me/favorites/channels/:id', (c) => {
      const s = state(store);
      const channel = findChannel(s, c.req.param('id'));
      if (!channel) return c.json(error('Channel not found'), 404);
      s.favorites = s.favorites.filter((id) => id !== channel.id);
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

export const label = 'SiriusXM API emulator';
export const endpoints = 'profile, channels, now-playing metadata, recent tracks, favorite channels';
export const capabilities = contract.scope;
export const initConfig = { siriusxm: { ...initialState(), accessToken: 'siriusxm_emulator_token' } };
export default plugin;
