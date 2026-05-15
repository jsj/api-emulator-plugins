function now() {
  return new Date().toISOString();
}

function initialState(config = {}) {
  const builds = config.builds ?? [{
    id: 'quest_build_seed',
    build_id: 'quest_build_seed',
    version: '1.0.0',
    version_code: 100,
    platform: 'quest',
    status: 'published',
    created_at: now(),
  }];
  return {
    app: config.app ?? { id: '123456', name: 'Oculus Emulator App', package_name: 'com.example.oculus' },
    access_tokens: config.access_tokens ?? [{ access_token: 'oculus_emulator_token', token_type: 'Bearer', expires_in: 3600 }],
    builds,
    release_channels: config.release_channels ?? [
      { id: 'rc_alpha', name: 'ALPHA', channel_name: 'ALPHA', latest_build_id: builds[0]?.id ?? null },
      { id: 'rc_beta', name: 'BETA', channel_name: 'BETA', latest_build_id: builds[0]?.id ?? null },
      { id: 'rc_production', name: 'PRODUCTION', channel_name: 'PRODUCTION', latest_build_id: builds[0]?.id ?? null },
    ],
    redists: config.redists ?? [{ id: 'redist_vcredist', name: 'Visual C++ Redistributable', platform: 'rift' }],
    next_build_id: builds.length + 1,
  };
}

function state(store) {
  const current = store.getData?.('oculus:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('oculus:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('oculus:state', next);
}

function channelWithBuild(current, channel) {
  const build = current.builds.find((item) => item.id === channel.latest_build_id || item.build_id === channel.latest_build_id) ?? null;
  return {
    ...channel,
    latest_build: build,
    latest_build_version: build?.version ?? null,
    latest_build_id: build?.id ?? null,
    latest_version_code: build?.version_code ?? null,
    latest_version_name: build?.version ?? null,
    version_code: build?.version_code ?? null,
    version_name: build?.version ?? null,
  };
}

function releaseChannelData(current, appId = current.app.id) {
  return {
    app_id: String(appId),
    release_channels: current.release_channels.map((channel) => channelWithBuild(current, channel)),
  };
}

function graphEnvelope(data) {
  return { data, extensions: { is_final: true } };
}

function graphqlData(current, query, variables = {}) {
  const appId = variables.appID ?? variables.appId ?? variables.applicationID ?? current.app.id;
  if (/release.?channels?|channel.?data|get.?release/i.test(query)) {
    const payload = releaseChannelData(current, appId);
    return graphEnvelope({
      node: { id: String(appId), ...payload },
      application: { id: String(appId), ...payload },
      oculus_application: { id: String(appId), ...payload },
      release_channels: payload.release_channels,
    });
  }
  if (/builds?/i.test(query)) {
    return graphEnvelope({
      node: { id: String(appId), builds: current.builds },
      application: { id: String(appId), builds: current.builds },
      builds: current.builds,
    });
  }
  return graphEnvelope({
    viewer: { id: 'oculus_viewer_emulator' },
    application: { id: String(appId), ...releaseChannelData(current, appId) },
  });
}

async function graphBody(c) {
  const contentType = c.req.header?.('content-type') ?? '';
  if (contentType.includes('application/x-www-form-urlencoded')) return c.req.parseBody?.() ?? {};
  return c.req.json().catch(async () => c.req.parseBody?.() ?? {});
}

function createBuild(current, body = {}) {
  const build = {
    id: `quest_build_${current.next_build_id++}`,
    build_id: `quest_build_${current.next_build_id - 1}`,
    version: body.version ?? body.version_name ?? '1.0.0',
    version_code: Number(body.version_code ?? body.versionCode ?? current.next_build_id),
    platform: body.platform ?? 'quest',
    status: body.draft ? 'draft' : 'uploaded',
    notes: body.notes ?? null,
    created_at: now(),
  };
  current.builds.push(build);
  return build;
}

export const contract = {
  provider: 'oculus',
  source: 'Meta Horizon/Oculus Platform Utility Graph API-compatible surface',
  docs: 'https://developer.oculus.com/',
  scope: ['graph-api', 'graphql', 'access-token', 'release-channels', 'builds', 'redists'],
  fidelity: 'stateful-graph-rest-emulator',
};

export const plugin = {
  name: 'oculus',
  register(app, store) {
    app.post('/graphql', async (c) => {
      const body = await graphBody(c);
      return c.json(graphqlData(state(store), String(body.query ?? ''), body.variables ?? {}));
    });

    app.get('/:appId/release_channels', (c) => c.json({ data: releaseChannelData(state(store), c.req.param('appId')).release_channels }));
    app.get('/:appId/release_channel_data', (c) => c.json(releaseChannelData(state(store), c.req.param('appId'))));
    app.get('/:appId/release-channel-data', (c) => c.json(releaseChannelData(state(store), c.req.param('appId'))));

    app.get('/:appId/builds', (c) => c.json({ data: state(store).builds }));
    app.post('/:appId/builds', async (c) => {
      const current = state(store);
      const build = createBuild(current, await c.req.json().catch(() => ({})));
      saveState(store, current);
      return c.json(build, 201);
    });
    app.get('/builds/:buildId', (c) => {
      const build = state(store).builds.find((item) => item.id === c.req.param('buildId') || item.build_id === c.req.param('buildId'));
      if (!build) return c.json({ error: 'build_not_found' }, 404);
      return c.json(build);
    });

    app.post('/:appId/release_channels/:channelName/build', async (c) => {
      const current = state(store);
      const body = await c.req.json().catch(() => ({}));
      const channelName = c.req.param('channelName').toUpperCase();
      const channel = current.release_channels.find((item) => item.name === channelName || item.id === c.req.param('channelName'));
      if (!channel) return c.json({ error: 'release_channel_not_found' }, 404);
      const buildId = body.build_id ?? body.buildId;
      if (!current.builds.some((build) => build.id === buildId || build.build_id === buildId)) return c.json({ error: 'build_not_found' }, 404);
      channel.latest_build_id = buildId;
      saveState(store, current);
      return c.json(channelWithBuild(current, channel));
    });

    app.post('/access_token', (c) => c.json(state(store).access_tokens[0]));
    app.post('/oauth/access_token', (c) => c.json(state(store).access_tokens[0]));
    app.get('/redists', (c) => c.json({ data: state(store).redists }));

    app.get('/horizon/apps/:appId/release-channel-data', (c) => c.json(releaseChannelData(state(store), c.req.param('appId'))));
    app.get('/horizon/apps/:appId/release_channels', (c) => c.json({ data: releaseChannelData(state(store), c.req.param('appId')).release_channels }));
    app.post('/horizon/apps/:appId/builds', async (c) => {
      const current = state(store);
      const build = createBuild(current, await c.req.json().catch(() => ({})));
      saveState(store, current);
      return c.json(build, 201);
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
    app.post('/inspect/reset', (c) => {
      saveState(store, initialState());
      return c.json({ ok: true });
    });
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Oculus / Meta Horizon Graph API emulator';
export const endpoints = 'GraphQL, release channels, builds, redists, access token, inspect';
export const capabilities = contract.scope;
export const initConfig = {
  oculus: initialState(),
};

export default plugin;
