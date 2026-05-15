import { fixedNow, getState, setState } from '../scripts/provider-plugin-kit.mjs';

const stateKey = 'flightradar24:state';

export const contract = {
  provider: 'flightradar24',
  source: 'Flightradar24 API OpenAPI subset',
  docs: 'https://fr24api.flightradar24.com/docs/endpoints/overview',
  baseUrl: 'https://fr24api.flightradar24.com',
  scope: ['live.flight-positions', 'static.airports', 'static.airlines', 'flight-tracks'],
  fidelity: 'deterministic-subset',
};

export const label = 'Flightradar24 API emulator';
export const endpoints = 'live flight positions, static airports, static airlines, flight tracks';
export const initConfig = { flightradar24: { apiToken: 'fr24-emulator-token', acceptVersion: 'v1' } };

function defaultState(baseUrl = contract.baseUrl) {
  return {
    baseUrl,
    flights: [
      {
        fr24_id: '391fdd79',
        hex: '406a3d',
        callsign: 'BAW117',
        lat: 51.4706,
        lon: -0.4619,
        track: 274,
        alt: 36000,
        gspeed: 486,
        vspeed: 0,
        squawk: '5271',
        timestamp: 1767225600,
        source: 'ADS-B',
        flight: 'BA117',
        type: 'B772',
        reg: 'G-YMMU',
        painted_as: 'BAW',
        operating_as: 'BAW',
        orig_iata: 'LHR',
        orig_icao: 'EGLL',
        dest_iata: 'JFK',
        dest_icao: 'KJFK',
        eta: 1767254100,
      },
    ],
    airports: {
      LHR: {
        name: 'London Heathrow Airport',
        iata: 'LHR',
        icao: 'EGLL',
        lat: 51.4706,
        lon: -0.4619,
        elevation: 83,
        country: 'United Kingdom',
        city: 'London',
        state: 'England',
        timezone: 'Europe/London',
        runways: [{ name: '09L/27R', length: 12799 }, { name: '09R/27L', length: 12001 }],
      },
      JFK: {
        name: 'John F. Kennedy International Airport',
        iata: 'JFK',
        icao: 'KJFK',
        lat: 40.6413,
        lon: -73.7781,
        elevation: 13,
        country: 'United States',
        city: 'New York',
        state: 'New York',
        timezone: 'America/New_York',
        runways: [{ name: '04L/22R', length: 12079 }, { name: '13R/31L', length: 14511 }],
      },
    },
    airlines: {
      BAW: { name: 'British Airways', iata: 'BA', icao: 'BAW' },
    },
    tracks: {
      '391fdd79': [
        { timestamp: 1767225600, lat: 51.4706, lon: -0.4619, alt: 0, gspeed: 0, vspeed: 1800, track: 274, squawk: '5271', callsign: 'BAW117', source: 'ADS-B' },
        { timestamp: 1767225900, lat: 51.72, lon: -1.4, alt: 18000, gspeed: 330, vspeed: 2100, track: 274, squawk: '5271', callsign: 'BAW117', source: 'ADS-B' },
        { timestamp: 1767226200, lat: 52.0, lon: -2.8, alt: 36000, gspeed: 486, vspeed: 0, track: 274, squawk: '5271', callsign: 'BAW117', source: 'ADS-B' },
      ],
    },
  };
}

function state(store) {
  return getState(store, stateKey, () => defaultState());
}

export function seedFromConfig(store, baseUrl = contract.baseUrl, seed = {}) {
  const seeded = defaultState(baseUrl);
  return setState(store, stateKey, {
    ...seeded,
    ...seed,
    flights: seed.flights ?? seeded.flights,
    airports: { ...seeded.airports, ...(seed.airports ?? {}) },
    airlines: { ...seeded.airlines, ...(seed.airlines ?? {}) },
    tracks: { ...seeded.tracks, ...(seed.tracks ?? {}) },
  });
}

function error(c, status, message, details = undefined) {
  return c.json({ message, ...(details ? { details } : {}) }, status);
}

function requireAuth(c) {
  if (!c.req.header('authorization')?.startsWith('Bearer ')) return { status: 401, message: 'Unauthenticated' };
  const version = c.req.header('accept-version');
  if (version && version !== 'v1') return { status: 400, message: 'Validation error', details: 'Accept-Version must be v1' };
  return null;
}

function validatePositionFilter(c) {
  const filters = ['bounds', 'flights', 'callsigns', 'registrations', 'airports', 'routes', 'aircraft', 'airspaces'];
  return filters.some((name) => c.req.query(name));
}

function limitItems(c, items, max = 30000) {
  const limit = Math.max(1, Math.min(Number(c.req.query('limit') ?? items.length), max));
  return items.slice(0, limit);
}

function lightFlight(flight) {
  const { fr24_id, hex, callsign, lat, lon, track, alt, gspeed, vspeed, squawk, timestamp, source } = flight;
  return { fr24_id, hex, callsign, lat, lon, track, alt, gspeed, vspeed, squawk, timestamp, source };
}

function airportLight(airport) {
  const { name, iata, icao } = airport;
  return { name, iata, icao };
}

function registerPositions(app, store, path, full = false, historic = false) {
  app.get(path, (c) => {
    const authError = requireAuth(c);
    if (authError) return error(c, authError.status, authError.message, authError.details);
    if (!validatePositionFilter(c)) return error(c, 400, 'Validation error', 'At least one query filter is required');
    if (historic && !c.req.query('timestamp')) return error(c, 400, 'Validation error', 'timestamp is required');

    const flights = limitItems(c, state(store).flights);
    return c.json({ data: flights.map((flight) => (full ? flight : lightFlight(flight))) });
  });
}

export const plugin = {
  name: 'flightradar24',
  register(app, store) {
    registerPositions(app, store, '/api/live/flight-positions/light');
    registerPositions(app, store, '/api/live/flight-positions/full', true);
    registerPositions(app, store, '/api/historic/flight-positions/light', false, true);
    registerPositions(app, store, '/api/historic/flight-positions/full', true, true);

    app.get('/api/live/flight-positions/count', (c) => {
      const authError = requireAuth(c);
      if (authError) return error(c, authError.status, authError.message, authError.details);
      if (!validatePositionFilter(c)) return error(c, 400, 'Validation error', 'At least one query filter is required');
      return c.json({ record_count: state(store).flights.length });
    });

    app.get('/api/static/airports/:code/light', (c) => {
      const authError = requireAuth(c);
      if (authError) return error(c, authError.status, authError.message, authError.details);
      const airport = state(store).airports[c.req.param('code').toUpperCase()];
      if (!airport) return error(c, 404, 'Airport not found');
      return c.json(airportLight(airport));
    });

    app.get('/api/static/airports/:code/full', (c) => {
      const authError = requireAuth(c);
      if (authError) return error(c, authError.status, authError.message, authError.details);
      const airport = state(store).airports[c.req.param('code').toUpperCase()];
      if (!airport) return error(c, 404, 'Airport not found');
      return c.json(airport);
    });

    app.get('/api/static/airlines/:icao/light', (c) => {
      const authError = requireAuth(c);
      if (authError) return error(c, authError.status, authError.message, authError.details);
      const airline = state(store).airlines[c.req.param('icao').toUpperCase()];
      if (!airline) return error(c, 404, 'Airline not found');
      return c.json(airline);
    });

    app.get('/api/flight-tracks', (c) => {
      const authError = requireAuth(c);
      if (authError) return error(c, authError.status, authError.message, authError.details);
      const flightId = c.req.query('flight_id') ?? c.req.query('flight_ids') ?? '391fdd79';
      const tracks = state(store).tracks[flightId];
      if (!tracks) return error(c, 404, 'Flight track not found');
      return c.json({ fr24_id: flightId, tracks });
    });

    app.get('/api/flight-summary/light', (c) => {
      const authError = requireAuth(c);
      if (authError) return error(c, authError.status, authError.message, authError.details);
      return c.json({ data: limitItems(c, state(store).flights, 20000).map(lightFlight) });
    });

    app.get('/api/flight-summary/full', (c) => {
      const authError = requireAuth(c);
      if (authError) return error(c, authError.status, authError.message, authError.details);
      return c.json({ data: limitItems(c, state(store).flights, 20000) });
    });

    app.get('/api/flight-summary/count', (c) => {
      const authError = requireAuth(c);
      if (authError) return error(c, authError.status, authError.message, authError.details);
      return c.json({ record_count: state(store).flights.length });
    });

    app.get('/flightradar24/inspect/state', (c) => c.json(state(store)));
  },
};

export default plugin;
