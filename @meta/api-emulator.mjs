import { createAdPlatformPlugin } from '../scripts/ad-platform-plugin-factory.mjs';

const mod = createAdPlatformPlugin({
  provider: 'meta',
  label: 'Meta Ads',
  docs: 'https://developers.facebook.com/docs/marketing-apis',
  source: 'Meta Marketing API OpenAPI-compatible surface',
});

function now() {
  return new Date().toISOString();
}

function initialHorizonState(config = {}) {
  const builds = config.builds ?? [{
    id: 'quest_build_seed',
    version: '1.0.0',
    version_code: 100,
    platform: 'quest',
    status: 'published',
    created_at: now(),
  }];
  return {
    builds,
    release_channels: config.release_channels ?? [
      { id: 'rc_alpha', name: 'ALPHA', latest_build_id: builds[0]?.id ?? null },
      { id: 'rc_beta', name: 'BETA', latest_build_id: builds[0]?.id ?? null },
      { id: 'rc_production', name: 'PRODUCTION', latest_build_id: builds[0]?.id ?? null },
    ],
    next_build_id: builds.length + 1,
  };
}

function horizonState(store) {
  const current = store.getData?.('meta:horizon-state');
  if (current) return current;
  const next = initialHorizonState();
  store.setData?.('meta:horizon-state', next);
  return next;
}

function saveHorizonState(store, next) {
  store.setData?.('meta:horizon-state', next);
}

function withLatestBuild(state, channel) {
  return {
    ...channel,
    latest_build: state.builds.find((build) => build.id === channel.latest_build_id) ?? null,
  };
}

function registerHorizonRoutes(app, store) {
  app.post('/horizon/access_token', (c) => c.json({
    access_token: 'meta_horizon_emulator_token',
    token_type: 'Bearer',
    expires_in: 3600,
  }));

  app.get('/horizon/apps/:appId/release_channels', (c) => {
    const state = horizonState(store);
    return c.json({ data: state.release_channels.map((channel) => withLatestBuild(state, channel)) });
  });

  app.get('/horizon/apps/:appId/release-channel-data', (c) => {
    const state = horizonState(store);
    return c.json({
      app_id: c.req.param('appId'),
      release_channels: state.release_channels.map((channel) => withLatestBuild(state, channel)),
    });
  });

  app.get('/horizon/apps/:appId/release_channels/:channelName', (c) => {
    const state = horizonState(store);
    const channelName = c.req.param('channelName').toUpperCase();
    const channel = state.release_channels.find((item) => item.name === channelName || item.id === c.req.param('channelName'));
    if (!channel) return c.json({ error: 'release_channel_not_found' }, 404);
    return c.json(withLatestBuild(state, channel));
  });

  app.post('/horizon/apps/:appId/release_channels/:channelName/build', async (c) => {
    const state = horizonState(store);
    const body = await c.req.json().catch(() => ({}));
    const channelName = c.req.param('channelName').toUpperCase();
    const channel = state.release_channels.find((item) => item.name === channelName || item.id === c.req.param('channelName'));
    if (!channel) return c.json({ error: 'release_channel_not_found' }, 404);
    if (!state.builds.some((build) => build.id === body.build_id)) return c.json({ error: 'build_not_found' }, 404);
    channel.latest_build_id = body.build_id;
    saveHorizonState(store, state);
    return c.json(withLatestBuild(state, channel));
  });

  app.get('/horizon/apps/:appId/builds', (c) => c.json({ data: horizonState(store).builds }));

  app.post('/horizon/apps/:appId/builds', async (c) => {
    const state = horizonState(store);
    const body = await c.req.json().catch(() => ({}));
    const build = {
      id: `quest_build_${state.next_build_id++}`,
      version: body.version ?? '1.0.0',
      version_code: Number(body.version_code ?? 1),
      platform: body.platform ?? 'quest',
      status: body.draft ? 'draft' : 'uploaded',
      notes: body.notes ?? null,
      created_at: now(),
    };
    state.builds.push(build);
    saveHorizonState(store, state);
    return c.json(build, 201);
  });

  app.get('/horizon/builds/:buildId', (c) => {
    const build = horizonState(store).builds.find((item) => item.id === c.req.param('buildId'));
    if (!build) return c.json({ error: 'build_not_found' }, 404);
    return c.json(build);
  });
}

export const contract = {
  ...mod.contract,
  scope: [...mod.contract.scope, 'horizon_builds', 'horizon_release_channels'],
};
export const label = mod.label;
export const endpoints = `${mod.endpoints}, Horizon release channels/builds/access-token`;
export const capabilities = contract.scope;
export const initConfig = {
  ...mod.initConfig,
  horizon: initialHorizonState(),
};
export function seedFromConfig(store, baseUrl, config = {}) {
  mod.seedFromConfig(store, baseUrl, config);
  saveHorizonState(store, initialHorizonState(config.horizon ?? {}));
}

export const plugin = {
  ...mod.plugin,
  register(app, store) {
    mod.plugin.register(app, store);
    registerHorizonRoutes(app, store);
  },
};
export default plugin;
