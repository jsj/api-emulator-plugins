const today = '2026-05-15';

function initialState(config = {}) {
  return {
    tokens: config.tokens ?? ['eight_sleep_emulator_token'],
    refreshToken: config.refreshToken ?? 'eight_sleep_refresh_emulator',
    user: config.user ?? {
      userId: 'usr_emulator',
      email: 'sleeper@example.test',
      firstName: 'Ada',
      lastName: 'Sleeper',
      features: ['temperature_control', 'sleep_tracking'],
      currentDevice: 'dev_emulator',
      devices: ['dev_emulator'],
    },
    devices: config.devices ?? [{
      deviceId: 'dev_emulator',
      name: 'Emulator Pod',
      ownerId: 'usr_emulator',
      leftUserId: 'usr_emulator',
      rightUserId: 'usr_partner',
      timezone: 'America/Los_Angeles',
      model: 'Pod 4',
      serial: '8SLP-EMU-0001',
      firmwareVersion: '1.0.0-emulator',
      connected: true,
    }],
    trends: config.trends ?? [{
      date: today,
      userId: 'usr_emulator',
      sleepScore: 92,
      sleepDurationSeconds: 25800,
      readinessScore: 87,
      hrv: 64,
      restingHeartRate: 49,
      respiratoryRate: 14.4,
      tossesAndTurns: 12,
      temperature: -1,
    }],
    intervals: config.intervals ?? [{
      id: 'int_emulator',
      ts: '2026-05-15T06:45:00.000Z',
      stage: 'awake',
      heartRate: 56,
      respiratoryRate: 14.2,
      hrv: 68,
      bedTempC: 28.5,
    }],
    temperatures: config.temperatures ?? {
      usr_emulator: {
        currentLevel: -1,
        targetLevel: -2,
        currentTempC: 27.8,
        heating: false,
      },
    },
  };
}

function state(store) {
  const current = store.getData?.('eight-sleep:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('eight-sleep:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('eight-sleep:state', next);
}

export function seedFromConfig(store, baseUrl, config = {}) {
  saveState(store, initialState(config));
}

function requireAuth(c, store) {
  const bearer = c.req.header?.('authorization')?.replace(/^Bearer\s+/i, '');
  const session = c.req.header?.('session-token');
  if ((bearer && state(store).tokens.includes(bearer)) || (session && state(store).tokens.includes(session))) return null;
  return c.json({ error: 'unauthorized', message: 'Missing or invalid token' }, 401);
}

async function body(c) {
  return c.req.json().catch(() => ({}));
}

function device(s, id) {
  return s.devices.find((item) => item.deviceId === id);
}

export const routes = [
  ['POST', '/v1/tokens'],
  ['POST', '/v1/login'],
  ['GET', '/v1/users/me'],
  ['GET', '/v1/devices/:deviceId'],
  ['GET', '/v1/users/:userId/trends'],
  ['GET', '/v1/users/:userId/intervals/:sessionId'],
  ['GET', '/v1/users/:userId/temperature'],
  ['PUT', '/v1/users/:userId/temperature'],
  ['GET', '/inspect/contract'],
  ['GET', '/inspect/state'],
].map(([method, path]) => ({ method, path }));

export const contract = {
  provider: 'eight-sleep',
  source: 'Community client-informed Eight Sleep API subset',
  docs: 'https://github.com/steipete/eightctl',
  baseUrl: 'https://client-api.8slp.net/v1',
  authBaseUrl: 'https://auth-api.8slp.net/v1',
  appBaseUrl: 'https://app-api.8slp.net/v1',
  scope: ['oauth-token', 'legacy-login', 'me', 'devices', 'trends', 'intervals', 'temperature', 'inspection'],
  coverage: { routeCount: routes.length, routes },
  fidelity: 'community-client-compatible-stateful-rest-emulator',
};

export const plugin = {
  name: 'eight-sleep',
  register(app, store) {
    app.post('/v1/tokens', async (c) => {
      const s = state(store);
      return c.json({
        access_token: s.tokens[0],
        refresh_token: s.refreshToken,
        token_type: 'Bearer',
        expires_in: 3600,
        userId: s.user.userId,
      });
    });
    app.post('/v1/login', async (c) => {
      const s = state(store);
      return c.json({ session: { token: s.tokens[0] }, user: s.user });
    });
    app.get('/v1/users/me', (c) => {
      const auth = requireAuth(c, store);
      return auth ?? c.json({ user: state(store).user });
    });
    app.get('/v1/devices/:deviceId', (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const row = device(state(store), c.req.param('deviceId'));
      return row ? c.json({ result: row }) : c.json({ error: 'not_found', message: 'Device not found' }, 404);
    });
    app.get('/v1/users/:userId/trends', (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const userId = c.req.param('userId');
      return c.json({ days: state(store).trends.filter((item) => item.userId === userId) });
    });
    app.get('/v1/users/:userId/intervals/:sessionId', (c) => {
      const auth = requireAuth(c, store);
      return auth ?? c.json({ next: null, intervals: state(store).intervals });
    });
    app.get('/v1/users/:userId/temperature', (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const temp = state(store).temperatures[c.req.param('userId')];
      return temp ? c.json({ result: temp }) : c.json({ error: 'not_found', message: 'Temperature settings not found' }, 404);
    });
    app.put('/v1/users/:userId/temperature', async (c) => {
      const auth = requireAuth(c, store);
      if (auth) return auth;
      const s = state(store);
      const userId = c.req.param('userId');
      const patch = await body(c);
      s.temperatures[userId] = { ...(s.temperatures[userId] ?? {}), ...patch };
      saveState(store, s);
      return c.json({ result: s.temperatures[userId] });
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};
