const createdAt = '2026-05-15T12:00:00.000Z';

function initialState(config = {}) {
  return {
    tokens: config.tokens ?? ['whoop_emulator_token'],
    profile: config.profile ?? {
      user_id: 10101,
      email: 'athlete@example.test',
      first_name: 'Ada',
      last_name: 'Athlete',
    },
    bodyMeasurement: config.bodyMeasurement ?? {
      height_meter: 1.72,
      weight_kilogram: 68.4,
      max_heart_rate: 188,
    },
    cycles: config.cycles ?? [{
      id: 9001,
      user_id: 10101,
      created_at: createdAt,
      updated_at: createdAt,
      start: '2026-05-14T22:30:00.000Z',
      end: '2026-05-15T22:30:00.000Z',
      timezone_offset: '-07:00',
      score_state: 'SCORED',
      score: {
        strain: 9.7,
        kilojoule: 8275,
        average_heart_rate: 71,
        max_heart_rate: 154,
      },
    }],
    recoveries: config.recoveries ?? [{
      cycle_id: 9001,
      sleep_id: 7001,
      user_id: 10101,
      created_at: createdAt,
      updated_at: createdAt,
      score_state: 'SCORED',
      score: {
        user_calibrating: false,
        recovery_score: 86,
        resting_heart_rate: 49,
        hrv_rmssd_milli: 82,
        spo2_percentage: 98.1,
        skin_temp_celsius: 33.1,
      },
    }],
    sleeps: config.sleeps ?? [{
      id: 7001,
      user_id: 10101,
      created_at: createdAt,
      updated_at: createdAt,
      start: '2026-05-14T23:05:00.000Z',
      end: '2026-05-15T06:45:00.000Z',
      timezone_offset: '-07:00',
      nap: false,
      score_state: 'SCORED',
      score: {
        stage_summary: {
          total_in_bed_time_milli: 28800000,
          total_awake_time_milli: 1800000,
          total_no_data_time_milli: 0,
          total_light_sleep_time_milli: 12600000,
          total_slow_wave_sleep_time_milli: 5400000,
          total_rem_sleep_time_milli: 9000000,
          sleep_cycle_count: 5,
          disturbance_count: 8,
        },
        sleep_needed: {
          baseline_milli: 27000000,
          need_from_sleep_debt_milli: 0,
          need_from_recent_strain_milli: 900000,
          need_from_recent_nap_milli: 0,
        },
        respiratory_rate: 14.5,
        sleep_performance_percentage: 94,
        sleep_consistency_percentage: 88,
        sleep_efficiency_percentage: 92,
      },
    }],
    workouts: config.workouts ?? [{
      id: 8001,
      user_id: 10101,
      created_at: createdAt,
      updated_at: createdAt,
      start: '2026-05-15T15:00:00.000Z',
      end: '2026-05-15T15:42:00.000Z',
      timezone_offset: '-07:00',
      sport_id: 1,
      score_state: 'SCORED',
      score: {
        strain: 7.4,
        average_heart_rate: 132,
        max_heart_rate: 171,
        kilojoule: 1750,
        percent_recorded: 100,
        distance_meter: 6200,
        altitude_gain_meter: 52,
        altitude_change_meter: 4,
        zone_duration: {
          zone_zero_milli: 120000,
          zone_one_milli: 480000,
          zone_two_milli: 900000,
          zone_three_milli: 720000,
          zone_four_milli: 300000,
          zone_five_milli: 0,
        },
      },
    }],
  };
}

function state(store) {
  const current = store.getData?.('whoop:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('whoop:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('whoop:state', next);
}

export function seedFromConfig(store, baseUrl, config = {}) {
  saveState(store, initialState(config));
}

function token(c) {
  return c.req.header?.('authorization')?.replace(/^Bearer\s+/i, '');
}

function requireAuth(c, store) {
  const bearer = token(c);
  if (bearer && state(store).tokens.includes(bearer)) return null;
  return c.json({ error: 'invalid_token', error_description: 'Missing or invalid bearer token' }, 401);
}

function page(c, rows) {
  const limit = Math.max(1, Math.min(Number(c.req.query?.('limit') ?? 25), 25));
  const nextToken = c.req.query?.('nextToken');
  const start = nextToken ? Number(nextToken) : 0;
  const records = rows.slice(start, start + limit);
  const next = start + limit < rows.length ? String(start + limit) : null;
  return { records, next_token: next };
}

export const routes = [
  ['GET', '/developer/v2/user/profile/basic'],
  ['GET', '/developer/v2/user/measurement/body'],
  ['GET', '/developer/v2/cycle'],
  ['GET', '/developer/v2/recovery'],
  ['GET', '/developer/v2/activity/sleep'],
  ['GET', '/developer/v2/activity/workout'],
  ['POST', '/oauth/oauth2/token'],
  ['GET', '/inspect/contract'],
  ['GET', '/inspect/state'],
].map(([method, path]) => ({ method, path }));

export const contract = {
  provider: 'whoop',
  source: 'WHOOP official OpenAPI v2',
  docs: 'https://developer.whoop.com/api/',
  openapi: 'https://api.prod.whoop.com/developer/doc/openapi.json',
  baseUrl: 'https://api.prod.whoop.com/developer',
  scope: ['profile', 'body-measurement', 'cycles', 'recovery', 'sleep', 'workout', 'oauth-token', 'inspection'],
  coverage: { routeCount: routes.length, routes },
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'whoop',
  register(app, store) {
    app.post('/oauth/oauth2/token', async (c) => {
      const s = state(store);
      const accessToken = s.tokens[0] ?? 'whoop_emulator_token';
      return c.json({
        access_token: accessToken,
        refresh_token: 'whoop_refresh_emulator',
        expires_in: 3600,
        scope: 'read:profile read:body_measurement read:cycles read:recovery read:sleep read:workout',
        token_type: 'bearer',
      });
    });
    app.get('/developer/v2/user/profile/basic', (c) => {
      const auth = requireAuth(c, store);
      return auth ?? c.json(state(store).profile);
    });
    app.get('/developer/v2/user/measurement/body', (c) => {
      const auth = requireAuth(c, store);
      return auth ?? c.json(state(store).bodyMeasurement);
    });
    app.get('/developer/v2/cycle', (c) => {
      const auth = requireAuth(c, store);
      return auth ?? c.json(page(c, state(store).cycles));
    });
    app.get('/developer/v2/recovery', (c) => {
      const auth = requireAuth(c, store);
      return auth ?? c.json(page(c, state(store).recoveries));
    });
    app.get('/developer/v2/activity/sleep', (c) => {
      const auth = requireAuth(c, store);
      return auth ?? c.json(page(c, state(store).sleeps));
    });
    app.get('/developer/v2/activity/workout', (c) => {
      const auth = requireAuth(c, store);
      return auth ?? c.json(page(c, state(store).workouts));
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};
