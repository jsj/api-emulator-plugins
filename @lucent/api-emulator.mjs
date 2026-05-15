function now() {
  return new Date().toISOString();
}

function initialState(config = {}) {
  return {
    publicKeys: config.publicKeys ?? ['luc_pk_emulator'],
    initRequests: [],
    replays: [],
    nextReplay: 1,
  };
}

function state(store) {
  const current = store.getData?.('lucent:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('lucent:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('lucent:state', next);
}

async function requestJson(c) {
  return c.req.json().catch(() => ({}));
}

function apiKey(c, body = {}) {
  return c.req.header?.('x-lucent-api-key')
    ?? c.req.query?.('api_key')
    ?? body.api_key
    ?? body.publicKey
    ?? body.public_key
    ?? null;
}

function validPublicKey(s, key) {
  return typeof key === 'string' && key.startsWith('luc_pk_') && (s.publicKeys.length === 0 || s.publicKeys.includes(key) || key === 'luc_pk_emulator');
}

export const routes = [
  ['POST', '/api/sdk/init'],
  ['POST', '/api/sdk/replay'],
  ['GET', '/api/sdk/replays'],
  ['GET', '/inspect/contract'],
  ['GET', '/inspect/state'],
].map(([method, path]) => ({ method, path }));

export const contract = {
  provider: 'lucent',
  source: '@lucenthq/cli validate endpoint and @lucenthq/sdk ingest transport',
  docs: 'https://docs.lucenthq.com',
  scope: ['cli-public-key-validation', 'session-replay-ingest', 'replay-listing', 'inspection'],
  coverage: { source: '@lucenthq/cli@0.1.0 and @lucenthq/sdk@0.0.5', routeCount: routes.length, routes },
  fidelity: 'cli-and-sdk-compatible-stateful-ingest-subset',
};

export const plugin = {
  name: 'lucent',
  register(app, store) {
    app.post('/api/sdk/init', async (c) => {
      const body = await requestJson(c);
      const s = state(store);
      const key = apiKey(c, body);
      s.initRequests.push({ id: `init_${s.initRequests.length + 1}`, public_key: key, received_at: now() });
      saveState(store, s);
      if (!validPublicKey(s, key)) {
        return c.json({ error: 'invalid_public_key', message: 'Invalid or revoked public key' }, 401);
      }
      return c.json({
        ok: true,
        organization_id: 'org_lucent_emulator',
        project_id: 'proj_lucent_emulator',
        ingest_base_url: new URL(c.req.url).origin,
      });
    });

    app.post('/api/sdk/replay', async (c) => {
      const body = await requestJson(c);
      const s = state(store);
      const key = apiKey(c, body);
      if (!validPublicKey(s, key)) {
        return c.json({ error: 'invalid_public_key', message: 'Invalid or revoked public key' }, 401);
      }
      const replay = {
        id: `replay_${s.nextReplay++}`,
        public_key: key,
        received_at: now(),
        session_id: body.session?.id ?? null,
        window_id: body.session?.windowId ?? null,
        sequence: body.replay?.sequence ?? null,
        event_count: Array.isArray(body.replay?.events) ? body.replay.events.length : 0,
        flush: body.flush ?? 'normal',
        payload: body,
      };
      s.replays.push(replay);
      saveState(store, s);
      return c.json({ ok: true, replay_id: replay.id, stored_events: replay.event_count }, 202);
    });

    app.get('/api/sdk/replays', (c) => c.json({ data: state(store).replays }));
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Lucent API emulator';
export const endpoints = 'CLI public-key validation, SDK replay ingestion, replay listing, and inspection';
export const capabilities = contract.scope;
export const initConfig = { lucent: initialState() };
export default plugin;
