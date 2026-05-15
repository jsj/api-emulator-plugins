const STATE_KEY = 'modal:state';

const nowSeconds = () => Math.floor(Date.now() / 1000);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultState(baseUrl = 'http://127.0.0.1') {
  const createdAt = 1_700_000_000;
  return {
    workspace: {
      id: 'ws-emulator',
      name: 'emulator',
      dashboardUrl: `${baseUrl}/modal/dashboard`,
    },
    token: {
      id: 'ak-emulator',
      name: 'emulator-token',
      userId: 'u-emulator',
      username: 'ada',
      createdAt,
    },
    environments: [
      {
        id: 'env-main',
        name: 'main',
        webhookSuffix: 'main',
        default: true,
        createdAt,
      },
    ],
    apps: [
      {
        id: 'ap-aaaaaaaaaaaaaaaaaaaaaa',
        name: 'api-emulator',
        description: 'api-emulator',
        state: 'deployed',
        environmentName: 'main',
        createdAt,
        stoppedAt: null,
        runningTasks: 1,
      },
      {
        id: 'ap-bbbbbbbbbbbbbbbbbbbbbb',
        name: 'worker-dev',
        description: 'worker-dev',
        state: 'ephemeral',
        environmentName: 'main',
        createdAt: createdAt + 60,
        stoppedAt: null,
        runningTasks: 0,
      },
    ],
    secrets: [
      {
        id: 'st-emulator',
        label: 'api-key',
        environmentName: 'main',
        createdAt,
        lastUsedAt: createdAt + 3600,
        metadata: { keys: ['MODAL_API_KEY'] },
      },
    ],
    volumes: [
      {
        id: 'vo-emulator',
        label: 'cache',
        environmentName: 'main',
        createdAt,
        metadata: { sizeBytes: 0 },
      },
    ],
  };
}

function modalState(store, baseUrl) {
  const state = store.getData(STATE_KEY);
  if (state) return state;
  const seeded = defaultState(baseUrl);
  store.setData(STATE_KEY, seeded);
  return seeded;
}

function saveState(store, state) {
  store.setData(STATE_KEY, state);
}

function modalError(c, status, code, message) {
  return c.json({ error: { code, message } }, status);
}

async function readJson(c) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

function nextId(prefix, values) {
  const suffix = String(values.length + 1).padStart(22, '0');
  return `${prefix}-${suffix}`;
}

function appToWire(app) {
  return {
    app_id: app.id,
    name: app.name,
    description: app.description,
    state: app.state,
    environment_name: app.environmentName,
    created_at: app.createdAt,
    stopped_at: app.stoppedAt,
    n_running_tasks: app.runningTasks,
  };
}

function envToWire(environment) {
  return {
    environment_id: environment.id,
    name: environment.name,
    webhook_suffix: environment.webhookSuffix,
    created_at: environment.createdAt,
    default: environment.default,
    is_managed: false,
    max_concurrent_tasks: 0,
    max_concurrent_gpus: 0,
    current_concurrent_tasks: 0,
    current_concurrent_gpus: 0,
  };
}

function secretToWire(secret) {
  return {
    secret_id: secret.id,
    label: secret.label,
    environment_name: secret.environmentName,
    created_at: secret.createdAt,
    last_used_at: secret.lastUsedAt,
    metadata: secret.metadata,
  };
}

function volumeToWire(volume) {
  return {
    volume_id: volume.id,
    label: volume.label,
    environment_name: volume.environmentName,
    created_at: volume.createdAt,
    metadata: volume.metadata,
  };
}

function registerRoutes(app, store) {
  app.get('/modal/inspect/state', (c) => c.json(clone(modalState(store))));

  app.post('/modal/inspect/reset', async (c) => {
    const body = await readJson(c);
    const state = { ...defaultState(body.base_url), ...body.state };
    saveState(store, state);
    return c.json(clone(state));
  });

  app.get('/modal/v1/token/info', (c) => {
    const state = modalState(store);
    return c.json({
      token_id: state.token.id,
      token_name: state.token.name,
      workspace_id: state.workspace.id,
      workspace_name: state.workspace.name,
      user_identity: {
        user_id: state.token.userId,
        username: state.token.username,
      },
      created_at: state.token.createdAt,
    });
  });

  app.get('/modal/v1/workspace', (c) => {
    const { workspace } = modalState(store);
    return c.json({ workspace_id: workspace.id, workspace_name: workspace.name, dashboard_url: workspace.dashboardUrl });
  });

  app.get('/modal/v1/environments', (c) => {
    const state = modalState(store);
    return c.json({ items: state.environments.map(envToWire) });
  });

  app.post('/modal/v1/environments', async (c) => {
    const state = modalState(store);
    const body = await readJson(c);
    if (!body.name) return modalError(c, 400, 'invalid_argument', 'name is required');
    if (state.environments.some((item) => item.name === body.name)) return modalError(c, 409, 'already_exists', 'environment already exists');
    const environment = {
      id: nextId('env', state.environments),
      name: body.name,
      webhookSuffix: body.webhook_suffix ?? body.name,
      default: false,
      createdAt: nowSeconds(),
    };
    state.environments.push(environment);
    saveState(store, state);
    return c.json(envToWire(environment), 201);
  });

  app.get('/modal/v1/apps', (c) => {
    const state = modalState(store);
    const environmentName = c.req.query?.('environment_name');
    const apps = environmentName ? state.apps.filter((item) => item.environmentName === environmentName) : state.apps;
    return c.json({ apps: apps.map(appToWire) });
  });

  app.post('/modal/v1/apps', async (c) => {
    const state = modalState(store);
    const body = await readJson(c);
    const name = body.name ?? body.description;
    if (!name) return modalError(c, 400, 'invalid_argument', 'name or description is required');
    const appRecord = {
      id: nextId('ap', state.apps),
      name,
      description: body.description ?? name,
      state: body.state ?? 'ephemeral',
      environmentName: body.environment_name ?? 'main',
      createdAt: nowSeconds(),
      stoppedAt: null,
      runningTasks: body.n_running_tasks ?? 0,
    };
    state.apps.push(appRecord);
    saveState(store, state);
    return c.json(appToWire(appRecord), 201);
  });

  app.get('/modal/v1/apps/:app_id', (c) => {
    const appRecord = modalState(store).apps.find((item) => item.id === c.req.param('app_id') || item.name === c.req.param('app_id'));
    if (!appRecord) return modalError(c, 404, 'not_found', 'app not found');
    return c.json(appToWire(appRecord));
  });

  app.patch('/modal/v1/apps/:app_id', async (c) => {
    const state = modalState(store);
    const appRecord = state.apps.find((item) => item.id === c.req.param('app_id') || item.name === c.req.param('app_id'));
    if (!appRecord) return modalError(c, 404, 'not_found', 'app not found');
    const body = await readJson(c);
    if (body.state) appRecord.state = body.state;
    if (body.description) appRecord.description = body.description;
    if (body.n_running_tasks !== undefined) appRecord.runningTasks = body.n_running_tasks;
    if (body.state === 'stopped') appRecord.stoppedAt = nowSeconds();
    saveState(store, state);
    return c.json(appToWire(appRecord));
  });

  app.delete('/modal/v1/apps/:app_id', (c) => {
    const state = modalState(store);
    const appRecord = state.apps.find((item) => item.id === c.req.param('app_id') || item.name === c.req.param('app_id'));
    if (!appRecord) return modalError(c, 404, 'not_found', 'app not found');
    appRecord.state = 'stopped';
    appRecord.runningTasks = 0;
    appRecord.stoppedAt = nowSeconds();
    saveState(store, state);
    return c.json(appToWire(appRecord));
  });

  app.get('/modal/v1/secrets', (c) => {
    const state = modalState(store);
    const environmentName = c.req.query?.('environment_name');
    const secrets = environmentName ? state.secrets.filter((item) => item.environmentName === environmentName) : state.secrets;
    return c.json({ environment_name: environmentName ?? 'main', items: secrets.map(secretToWire) });
  });

  app.post('/modal/v1/secrets', async (c) => {
    const state = modalState(store);
    const body = await readJson(c);
    const label = body.label ?? body.name;
    if (!label) return modalError(c, 400, 'invalid_argument', 'label is required');
    const secret = {
      id: nextId('st', state.secrets),
      label,
      environmentName: body.environment_name ?? 'main',
      createdAt: nowSeconds(),
      lastUsedAt: 0,
      metadata: body.metadata ?? { keys: Object.keys(body.values ?? {}) },
    };
    state.secrets.push(secret);
    saveState(store, state);
    return c.json(secretToWire(secret), 201);
  });

  app.get('/modal/v1/volumes', (c) => {
    const state = modalState(store);
    const environmentName = c.req.query?.('environment_name');
    const volumes = environmentName ? state.volumes.filter((item) => item.environmentName === environmentName) : state.volumes;
    return c.json({ environment_name: environmentName ?? 'main', items: volumes.map(volumeToWire) });
  });

  app.post('/modal/v1/volumes', async (c) => {
    const state = modalState(store);
    const body = await readJson(c);
    const label = body.label ?? body.name;
    if (!label) return modalError(c, 400, 'invalid_argument', 'label is required');
    const volume = {
      id: nextId('vo', state.volumes),
      label,
      environmentName: body.environment_name ?? 'main',
      createdAt: nowSeconds(),
      metadata: body.metadata ?? { sizeBytes: 0 },
    };
    state.volumes.push(volume);
    saveState(store, state);
    return c.json(volumeToWire(volume), 201);
  });
}

export const contract = {
  provider: 'modal',
  source: 'Modal Python client protobuf contract and CLI-compatible gRPC subset',
  docs: 'https://modal.com/docs/reference',
  baseUrl: 'https://api.modal.com',
  scope: ['token-info', 'workspace', 'environments', 'apps', 'secrets', 'volumes', 'inspection'],
  fidelity: 'protobuf-derived-control-plane-subset',
};

export const plugin = {
  name: 'modal',
  register(app, store) {
    registerRoutes(app, store);
  },
};

export function seedFromConfig(store, baseUrl, config = {}) {
  const state = { ...defaultState(baseUrl), ...(config.modal ?? {}) };
  saveState(store, state);
}

export const label = 'Modal API emulator';
export const endpoints = 'token info, workspace, environments, apps, secrets, volumes, and inspect/reset';
export const capabilities = contract.scope;
export const initConfig = {
  modal: {
    token: { id: 'ak-emulator', name: 'emulator-token', userId: 'u-emulator', username: 'ada', createdAt: 1_700_000_000 },
  },
};
