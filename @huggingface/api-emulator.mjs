const STATE_KEY = 'huggingface:state';

const now = '2026-01-01T00:00:00.000Z';

function repoId(type, name) {
  return `${type}-${name}`.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

function objectId(seed) {
  return Buffer.from(seed).toString('hex').padEnd(24, '0').slice(0, 24);
}

function makeRepo(type, name, patch = {}) {
  const id = repoId(type, name);
  const author = name.includes('/') ? name.split('/')[0] : 'emulator';
  return {
    _id: objectId(id),
    id: name,
    modelId: type === 'model' ? name : undefined,
    name: name.split('/').pop(),
    author,
    private: false,
    gated: false,
    disabled: false,
    downloads: 42,
    likes: 7,
    tags: type === 'model' ? ['text-generation', 'transformers', 'safetensors'] : ['emulator'],
    pipeline_tag: type === 'model' ? 'text-generation' : undefined,
    sha: '0123456789abcdef0123456789abcdef01234567',
    createdAt: now,
    lastModified: now,
    siblings: [
      { rfilename: 'README.md' },
      ...(type === 'model' ? [{ rfilename: 'config.json' }, { rfilename: 'model.safetensors' }] : [{ rfilename: 'data.jsonl' }]),
    ],
    ...patch,
  };
}

function defaultState(baseUrl = 'https://huggingface.co') {
  return {
    baseUrl,
    user: {
      type: 'user',
      id: objectId('emulator-user'),
      name: 'emulator',
      fullname: 'Hugging Face Emulator',
      email: 'emulator@example.test',
      emailVerified: true,
      canPay: false,
      isPro: false,
      avatarUrl: `${baseUrl}/avatars/emulator.png`,
      orgs: [
        {
          type: 'org',
          id: objectId('emulator-org'),
          name: 'emulator-org',
          fullname: 'Emulator Org',
        },
      ],
      auth: {
        type: 'access_token',
        accessToken: {
          displayName: 'hf_emulator_token',
          role: 'write',
          fineGrained: { scoped: [] },
        },
      },
    },
    repos: {
      model: [
        makeRepo('model', 'emulator/hello-world', {
          cardData: { license: 'apache-2.0', language: ['en'] },
          config: { architectures: ['EmulatorModel'], model_type: 'emulator' },
        }),
      ],
      dataset: [
        makeRepo('dataset', 'emulator/sample-dataset', {
          description: 'Deterministic emulator dataset',
          tags: ['json', 'dataset'],
        }),
      ],
      space: [
        makeRepo('space', 'emulator/demo-space', {
          sdk: 'gradio',
          runtime: { stage: 'RUNNING', hardware: { current: 'cpu-basic' } },
          tags: ['gradio', 'space'],
        }),
      ],
    },
    createdRepos: [],
    likes: [
      {
        user: 'emulator',
        repo: { type: 'model', name: 'emulator/hello-world' },
        createdAt: now,
      },
    ],
    oauth: {
      clients: [
        {
          client_id: 'hf_emulator_client',
          client_secret: 'hf_emulator_secret',
          client_name: 'Hugging Face Emulator OAuth App',
          redirect_uris: ['http://localhost/callback'],
          scopes: ['openid', 'profile', 'email', 'read-repos', 'write-repos', 'manage-repos'],
        },
      ],
      codes: [],
      deviceCodes: [],
      tokens: [],
    },
  };
}

function getState(store) {
  const existing = store.getData?.(STATE_KEY);
  if (existing) return existing;
  const seeded = defaultState();
  store.setData?.(STATE_KEY, seeded);
  return seeded;
}

function setState(store, state) {
  store.setData?.(STATE_KEY, state);
}

function repoTypeFromPlural(plural) {
  return plural === 'models' ? 'model' : plural === 'datasets' ? 'dataset' : 'space';
}

function repoPlural(type) {
  return type === 'model' ? 'models' : type === 'dataset' ? 'datasets' : 'spaces';
}

function findRepo(state, type, name) {
  return state.repos[type]?.find((repo) => repo.id === name || repo.name === name);
}

function listRepos(c, store, type) {
  const state = getState(store);
  const search = c.req.query?.('search')?.toLowerCase();
  const author = c.req.query?.('author');
  const limit = Number(c.req.query?.('limit') ?? 100);
  let repos = [...(state.repos[type] ?? [])];
  if (search) repos = repos.filter((repo) => repo.id.toLowerCase().includes(search) || repo.tags?.some((tag) => tag.includes(search)));
  if (author) repos = repos.filter((repo) => repo.author === author);
  return c.json(repos.slice(0, limit).map((repo) => normalizeRepo(repo, type)));
}

function normalizeRepo(repo, type) {
  const copy = Object.fromEntries(Object.entries(repo).filter(([, value]) => value !== undefined));
  if (type !== 'model') delete copy.modelId;
  return copy;
}

function repoInfo(c, store, type, name) {
  const state = getState(store);
  const repo = findRepo(state, type, name);
  if (!repo) return hfError(c, `Repository Not Found for url: ${name}`, 404);
  return c.json(normalizeRepo(repo, type));
}

function treeEntries(repo, path = '') {
  const files = repo.siblings?.map((sibling) => sibling.rfilename) ?? [];
  if (!path) {
    return files.map((file) => ({
      type: file.includes('/') ? 'directory' : 'file',
      oid: '0123456789abcdef0123456789abcdef01234567',
      size: file.endsWith('.safetensors') ? 1024 : 128,
      path: file,
    }));
  }
  return files
    .filter((file) => file.startsWith(`${path}/`) || file === path)
    .map((file) => ({
      type: 'file',
      oid: '0123456789abcdef0123456789abcdef01234567',
      size: file.endsWith('.safetensors') ? 1024 : 128,
      path: file,
    }));
}

function repoTree(c, store, type, name) {
  const state = getState(store);
  const repo = findRepo(state, type, name);
  if (!repo) return hfError(c, `Repository Not Found for url: ${name}`, 404);
  return c.json(treeEntries(repo, c.req.param?.('path') ?? ''));
}

function listUserLikes(c, store) {
  const state = getState(store);
  const user = c.req.param('user');
  return c.json(state.likes.filter((like) => like.user === user));
}

function listRepoLikers(c, store, type, name) {
  const state = getState(store);
  if (!findRepo(state, type, name)) return hfError(c, `Repository Not Found for url: ${name}`, 404);
  return c.json(
    state.likes
      .filter((like) => like.repo.type === type && like.repo.name === name)
      .map((like) => ({
        user: like.user,
        fullname: state.user.fullname,
        avatarUrl: state.user.avatarUrl,
      })),
  );
}

function likeRepo(c, store, type, name) {
  const state = getState(store);
  const repo = findRepo(state, type, name);
  if (!repo) return hfError(c, `Repository Not Found for url: ${name}`, 404);
  if (!state.likes.some((like) => like.user === state.user.name && like.repo.type === type && like.repo.name === name)) {
    state.likes.push({ user: state.user.name, repo: { type, name }, createdAt: now });
    repo.likes = (repo.likes ?? 0) + 1;
  }
  setState(store, state);
  return c.json({ liked: true, likes: repo.likes });
}

function unlikeRepo(c, store, type, name) {
  const state = getState(store);
  const repo = findRepo(state, type, name);
  if (!repo) return hfError(c, `Repository Not Found for url: ${name}`, 404);
  const before = state.likes.length;
  state.likes = state.likes.filter((like) => !(like.user === state.user.name && like.repo.type === type && like.repo.name === name));
  if (state.likes.length !== before) repo.likes = Math.max(0, (repo.likes ?? 0) - 1);
  setState(store, state);
  return c.json({ liked: false, likes: repo.likes });
}

function hfError(c, message, status = 400) {
  return c.json({ error: message }, status);
}

async function parseBody(c) {
  const contentType = c.req.header?.('content-type') ?? c.req.header?.('Content-Type') ?? '';
  if (contentType.includes('application/json')) return c.req.json();
  if (c.req.parseBody) return c.req.parseBody();
  if (c.req.text) return Object.fromEntries(new URLSearchParams(await c.req.text()));
  return c.req.json();
}

function oauthUserInfo(state) {
  return {
    sub: state.user.id,
    name: state.user.name,
    preferred_username: state.user.name,
    profile: `${state.baseUrl}/${state.user.name}`,
    picture: state.user.avatarUrl,
    email: state.user.email,
    email_verified: state.user.emailVerified,
    organizations: {
      sub: state.user.orgs.map((org) => org.id),
      preferred_username: state.user.orgs.map((org) => org.name),
    },
  };
}

function tokenResponse(state, scope = 'openid profile email') {
  const accessToken = `hf_oauth_${state.oauth.tokens.length + 1}`;
  const token = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: `hf_refresh_${state.oauth.tokens.length + 1}`,
    scope,
    id_token: `hf_id_token_${state.oauth.tokens.length + 1}`,
  };
  state.oauth.tokens.push({ ...token, createdAt: now });
  return token;
}

export function seedFromConfig(store, baseUrl = 'https://huggingface.co', config = {}) {
  const state = defaultState(baseUrl);
  if (config.user) state.user = { ...state.user, ...config.user };
  for (const type of ['model', 'dataset', 'space']) {
    if (config.repos?.[type]) state.repos[type] = config.repos[type].map((repo) => makeRepo(type, repo.id, repo));
  }
  setState(store, state);
  return state;
}

export const contract = {
  provider: 'huggingface',
  source: 'Hugging Face Hub OpenAPI subset from https://huggingface.co/.well-known/openapi.json',
  docs: 'https://huggingface.co/docs/hub/api',
  baseUrl: 'https://huggingface.co',
  scope: ['whoami', 'models', 'datasets', 'spaces', 'repos', 'oauth'],
  fidelity: 'deterministic-hub-subset',
};

export const plugin = {
  name: 'huggingface',
  seed: seedFromConfig,
  register(app, store) {
    app.get('/.well-known/openid-configuration', (c) => {
      const state = getState(store);
      return c.json({
        issuer: state.baseUrl,
        authorization_endpoint: `${state.baseUrl}/oauth/authorize`,
        token_endpoint: `${state.baseUrl}/oauth/token`,
        userinfo_endpoint: `${state.baseUrl}/oauth/userinfo`,
        device_authorization_endpoint: `${state.baseUrl}/oauth/device`,
        registration_endpoint: `${state.baseUrl}/oauth/register`,
        jwks_uri: `${state.baseUrl}/.well-known/jwks.json`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token', 'urn:ietf:params:oauth:grant-type:device_code', 'urn:ietf:params:oauth:grant-type:token-exchange'],
        scopes_supported: ['openid', 'profile', 'email', 'read-repos', 'write-repos', 'manage-repos', 'read-billing', 'write-discussions'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
      });
    });
    app.get('/.well-known/jwks.json', (c) => c.json({ keys: [] }));
    app.get('/api/whoami-v2', (c) => c.json(getState(store).user));
    app.get('/api/users/:user/likes', (c) => listUserLikes(c, store));

    for (const plural of ['models', 'datasets', 'spaces']) {
      const type = repoTypeFromPlural(plural);
      app.get(`/api/${plural}`, (c) => listRepos(c, store, type));
      app.get(`/api/${plural}/:namespace/:repo`, (c) => repoInfo(c, store, type, `${c.req.param('namespace')}/${c.req.param('repo')}`));
      app.get(`/api/${plural}/:repo`, (c) => repoInfo(c, store, type, c.req.param('repo')));
      app.get(`/api/${plural}/:namespace/:repo/tree/:rev`, (c) => repoTree(c, store, type, `${c.req.param('namespace')}/${c.req.param('repo')}`));
      app.get(`/api/${plural}/:namespace/:repo/tree/:rev/:path{.+}`, (c) => repoTree(c, store, type, `${c.req.param('namespace')}/${c.req.param('repo')}`));
      app.get(`/api/${plural}/:namespace/:repo/likers`, (c) => listRepoLikers(c, store, type, `${c.req.param('namespace')}/${c.req.param('repo')}`));
      app.post(`/api/${plural}/:namespace/:repo/like`, (c) => likeRepo(c, store, type, `${c.req.param('namespace')}/${c.req.param('repo')}`));
      app.delete?.(`/api/${plural}/:namespace/:repo/like`, (c) => unlikeRepo(c, store, type, `${c.req.param('namespace')}/${c.req.param('repo')}`));
      app.get(`/api/${plural}/:namespace/:repo/refs`, (c) =>
        c.json({
          branches: [{ name: 'main', ref: 'refs/heads/main', targetCommit: '0123456789abcdef0123456789abcdef01234567' }],
          tags: [],
          converts: [],
          pullRequests: [],
        }),
      );
    }

    app.post('/api/repos/create', async (c) => {
      const body = await c.req.json();
      const type = body.type ?? body.repo_type ?? 'model';
      const name = body.organization ? `${body.organization}/${body.name}` : body.name;
      if (!name) return hfError(c, 'Missing repository name', 400);
      const state = getState(store);
      const repo = makeRepo(type, name, { private: Boolean(body.private), license: body.license });
      state.repos[type] = state.repos[type] ?? [];
      state.repos[type].push(repo);
      state.createdRepos.push({ type, name, createdAt: now });
      setState(store, state);
      return c.json({ url: `${state.baseUrl}/${repoPlural(type)}/${name}`, name, id: repo._id }, 201);
    });

    app.get('/oauth/authorize', (c) => {
      const state = getState(store);
      const redirectUri = c.req.query?.('redirect_uri') ?? 'http://localhost/callback';
      const code = `hf_code_${state.oauth.codes.length + 1}`;
      const scope = c.req.query?.('scope') ?? 'openid profile';
      state.oauth.codes.push({
        code,
        client_id: c.req.query?.('client_id') ?? 'hf_emulator_client',
        redirect_uri: redirectUri,
        scope,
        state: c.req.query?.('state') ?? '',
        createdAt: now,
      });
      setState(store, state);
      const target = new URL(redirectUri);
      target.searchParams.set('code', code);
      const oauthState = c.req.query?.('state');
      if (oauthState) target.searchParams.set('state', oauthState);
      return c.redirect ? c.redirect(target.toString(), 302) : c.json({ redirect_to: target.toString(), code }, 302);
    });

    app.post('/oauth/register', async (c) => {
      const body = await parseBody(c);
      const state = getState(store);
      const client = {
        client_id: `hf_client_${state.oauth.clients.length + 1}`,
        client_secret: `hf_secret_${state.oauth.clients.length + 1}`,
        client_name: body.client_name ?? 'Emulator OAuth App',
        redirect_uris: body.redirect_uris ?? ['http://localhost/callback'],
        scopes: body.scope ? String(body.scope).split(/\s+/) : ['openid', 'profile', 'email'],
        client_id_issued_at: 1767225600,
      };
      state.oauth.clients.push(client);
      setState(store, state);
      return c.json(client, 201);
    });

    app.post('/oauth/device', async (c) => {
      const body = await parseBody(c);
      const state = getState(store);
      const index = state.oauth.deviceCodes.length + 1;
      const device = {
        device_code: `hf_device_${index}`,
        user_code: `HF-${String(index).padStart(4, '0')}`,
        verification_uri: `${state.baseUrl}/oauth/authorize`,
        verification_uri_complete: `${state.baseUrl}/oauth/authorize?user_code=HF-${String(index).padStart(4, '0')}`,
        expires_in: 600,
        interval: 1,
        client_id: body.client_id ?? 'hf_emulator_client',
        scope: body.scope ?? 'openid profile',
        authorized: true,
        createdAt: now,
      };
      state.oauth.deviceCodes.push(device);
      setState(store, state);
      return c.json(device);
    });

    app.post('/oauth/token', async (c) => {
      const body = await parseBody(c);
      const state = getState(store);
      const grantType = body.grant_type ?? 'authorization_code';
      if (grantType === 'authorization_code' && body.code && !state.oauth.codes.some((entry) => entry.code === body.code)) {
        return c.json({ error: 'invalid_grant', error_description: 'Unknown authorization code' }, 400);
      }
      if (grantType === 'urn:ietf:params:oauth:grant-type:device_code' && body.device_code && !state.oauth.deviceCodes.some((entry) => entry.device_code === body.device_code)) {
        return c.json({ error: 'authorization_pending' }, 400);
      }
      return c.json(tokenResponse(state, body.scope ?? state.oauth.codes.find((entry) => entry.code === body.code)?.scope ?? 'openid profile email'));
    });

    app.get('/oauth/userinfo', (c) => c.json(oauthUserInfo(getState(store))));
    app.post('/oauth/userinfo', (c) => c.json(oauthUserInfo(getState(store))));

    app.get('/huggingface/inspect/state', (c) => c.json(getState(store)));
    app.post('/huggingface/reset', (c) => {
      setState(store, defaultState());
      return c.json({ ok: true });
    });
    app.get('/inspect/contract', (c) => c.json(contract));
  },
};

export const label = 'Hugging Face Hub API emulator';
export const endpoints = 'whoami-v2, models/search, model-likes, datasets, spaces, repos/create, oauth';
export const capabilities = contract.scope;
export const initConfig = { huggingface: { token: 'hf_emulator_token' } };

export default plugin;
