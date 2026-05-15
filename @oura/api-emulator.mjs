const date = '2026-05-15';
const createdAt = '2026-05-15T12:00:00+00:00';

function initialState(config = {}) {
  return {
    tokens: config.tokens ?? ['oura_emulator_token'],
    personalInfo: config.personalInfo ?? {
      id: 'oura-user-emulator',
      age: 36,
      weight: 68.4,
      height: 1.72,
      biological_sex: 'female',
      email: 'ring@example.test',
    },
    dailySleep: config.dailySleep ?? [{
      id: 'daily_sleep_emulator',
      day: date,
      score: 91,
      timestamp: createdAt,
      contributors: {
        deep_sleep: 95,
        efficiency: 88,
        latency: 82,
        rem_sleep: 93,
        restfulness: 89,
        timing: 91,
        total_sleep: 94,
      },
    }],
    sleep: config.sleep ?? [{
      id: 'sleep_emulator',
      day: date,
      bedtime_start: '2026-05-14T23:05:00-07:00',
      bedtime_end: '2026-05-15T06:45:00-07:00',
      type: 'long_sleep',
      total_sleep_duration: 25800,
      awake_time: 1800,
      rem_sleep_duration: 7200,
      deep_sleep_duration: 5400,
      light_sleep_duration: 13200,
      efficiency: 92,
      readiness: { score: 87 },
    }],
    dailyReadiness: config.dailyReadiness ?? [{
      id: 'readiness_emulator',
      day: date,
      score: 87,
      temperature_deviation: 0.1,
      temperature_trend_deviation: 0.05,
      contributors: {
        activity_balance: 83,
        body_temperature: 98,
        hrv_balance: 91,
        previous_day_activity: 80,
        previous_night: 92,
        recovery_index: 89,
        resting_heart_rate: 94,
        sleep_balance: 90,
      },
    }],
    dailyActivity: config.dailyActivity ?? [{
      id: 'activity_emulator',
      day: date,
      score: 82,
      active_calories: 540,
      average_met_minutes: 1.6,
      equivalent_walking_distance: 8600,
      high_activity_met_minutes: 48,
      inactivity_alerts: 1,
      low_activity_met_minutes: 210,
      medium_activity_met_minutes: 90,
      meters_to_target: 0,
      non_wear_time: 0,
      resting_time: 28800,
      steps: 10420,
      total_calories: 2240,
    }],
    workouts: config.workouts ?? [{
      id: 'workout_emulator',
      activity: 'running',
      day: date,
      start_datetime: '2026-05-15T15:00:00-07:00',
      end_datetime: '2026-05-15T15:42:00-07:00',
      intensity: 'moderate',
      label: 'Lunch run',
      calories: 420,
      distance: 6200,
    }],
    heartrate: config.heartrate ?? [{
      bpm: 62,
      source: 'awake',
      timestamp: '2026-05-15T12:00:00+00:00',
    }],
  };
}

function state(store) {
  const current = store.getData?.('oura:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('oura:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('oura:state', next);
}

export function seedFromConfig(store, baseUrl, config = {}) {
  saveState(store, initialState(config));
}

function requireAuth(c, store) {
  const bearer = c.req.header?.('authorization')?.replace(/^Bearer\s+/i, '');
  if (bearer && state(store).tokens.includes(bearer)) return null;
  return c.json({ status: 401, title: 'Unauthorized', detail: 'Missing or invalid bearer token' }, 401);
}

function list(c, rows) {
  const nextToken = c.req.query?.('next_token');
  const start = nextToken ? Number(nextToken) : 0;
  const pageSize = 50;
  return {
    data: rows.slice(start, start + pageSize),
    next_token: start + pageSize < rows.length ? String(start + pageSize) : null,
  };
}

export const routes = [
  ['GET', '/v2/usercollection/personal_info'],
  ['GET', '/v2/usercollection/daily_sleep'],
  ['GET', '/v2/usercollection/sleep'],
  ['GET', '/v2/usercollection/daily_readiness'],
  ['GET', '/v2/usercollection/daily_activity'],
  ['GET', '/v2/usercollection/workout'],
  ['GET', '/v2/usercollection/heartrate'],
  ['GET', '/v2/sandbox/usercollection/daily_sleep'],
  ['GET', '/inspect/contract'],
  ['GET', '/inspect/state'],
].map(([method, path]) => ({ method, path }));

export const contract = {
  provider: 'oura',
  source: 'Oura Ring official OpenAPI v2',
  docs: 'https://cloud.ouraring.com/v2/docs',
  openapi: 'https://cloud.ouraring.com/v2/static/json/openapi-1.29.json',
  baseUrl: 'https://api.ouraring.com',
  scope: ['personal-info', 'daily-sleep', 'sleep', 'daily-readiness', 'daily-activity', 'workout', 'heartrate', 'sandbox', 'inspection'],
  coverage: { routeCount: routes.length, routes },
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'oura',
  register(app, store) {
    app.get('/v2/usercollection/personal_info', (c) => {
      const auth = requireAuth(c, store);
      return auth ?? c.json(state(store).personalInfo);
    });
    app.get('/v2/usercollection/daily_sleep', (c) => {
      const auth = requireAuth(c, store);
      return auth ?? c.json(list(c, state(store).dailySleep));
    });
    app.get('/v2/usercollection/sleep', (c) => {
      const auth = requireAuth(c, store);
      return auth ?? c.json(list(c, state(store).sleep));
    });
    app.get('/v2/usercollection/daily_readiness', (c) => {
      const auth = requireAuth(c, store);
      return auth ?? c.json(list(c, state(store).dailyReadiness));
    });
    app.get('/v2/usercollection/daily_activity', (c) => {
      const auth = requireAuth(c, store);
      return auth ?? c.json(list(c, state(store).dailyActivity));
    });
    app.get('/v2/usercollection/workout', (c) => {
      const auth = requireAuth(c, store);
      return auth ?? c.json(list(c, state(store).workouts));
    });
    app.get('/v2/usercollection/heartrate', (c) => {
      const auth = requireAuth(c, store);
      return auth ?? c.json(list(c, state(store).heartrate));
    });
    app.get('/v2/sandbox/usercollection/daily_sleep', (c) => c.json(list(c, state(store).dailySleep)));
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};
