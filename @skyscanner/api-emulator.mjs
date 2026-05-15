import { fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const stateKey = 'skyscanner:state';

function defaultState(baseUrl = contract.baseUrl) {
  return {
    baseUrl,
    sessions: {},
    refreshSessions: {},
    airports: {
      LHR: { entityId: '95565050', iata: 'LHR', name: 'London Heathrow', type: 'PLACE_TYPE_AIRPORT' },
      JFK: { entityId: '95565058', iata: 'JFK', name: 'New York John F. Kennedy', type: 'PLACE_TYPE_AIRPORT' },
    },
    carriers: {
      BA: { name: 'British Airways', allianceId: 'oneworld', imageUrl: `${baseUrl}/images/carriers/BA.png`, iata: 'BA' },
    },
    agents: {
      skyscanner: {
        name: 'Skyscanner Emulator',
        type: 'AGENT_TYPE_TRAVEL_AGENT',
        imageUrl: `${baseUrl}/images/agents/skyscanner.png`,
        optimisedForMobile: true,
      },
    },
  };
}

export const contract = {
  provider: 'skyscanner',
  source: 'Skyscanner Flights Live Prices OpenAPI subset',
  docs: 'https://developers.skyscanner.net/api/flights-live-pricing',
  baseUrl: 'https://partners.api.skyscanner.net',
  scope: ['flights.live.search', 'flights.live.itineraryrefresh'],
  fidelity: 'deterministic-subset',
};

export const label = 'Skyscanner Travel API emulator';
export const endpoints = 'flights live search create, poll, itinerary refresh';
export const initConfig = { skyscanner: { apiKey: 'skyscanner-emulator-key' } };

function state(store) {
  return getState(store, stateKey, () => defaultState());
}

export function seedFromConfig(store, baseUrl = contract.baseUrl, seed = {}) {
  const seeded = defaultState(baseUrl);
  return setState(store, stateKey, {
    ...seeded,
    ...seed,
    airports: { ...seeded.airports, ...(seed.airports ?? {}) },
    carriers: { ...seeded.carriers, ...(seed.carriers ?? {}) },
    agents: { ...seeded.agents, ...(seed.agents ?? {}) },
    sessions: { ...seeded.sessions, ...(seed.sessions ?? {}) },
    refreshSessions: { ...seeded.refreshSessions, ...(seed.refreshSessions ?? {}) },
  });
}

function rpcStatus(message, status = 400, code = 3) {
  return { body: { code, message, details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo' }] }, status };
}

function requireApiKey(c) {
  if (c.req.header('x-api-key')) return null;
  return rpcStatus('Missing x-api-key header', 401, 16);
}

function placeId(place) {
  return place?.iata ?? place?.entityId ?? 'LHR';
}

function datePart(date, fallback) {
  return {
    year: Number(date?.year ?? fallback.year),
    month: Number(date?.month ?? fallback.month),
    day: Number(date?.day ?? fallback.day),
  };
}

function dateTime(date, hour, minute = 0) {
  return { ...date, hour, minute, second: 0 };
}

function buildContent(current, query = {}, sessionToken = 'search_000001') {
  const leg = query.queryLegs?.[0] ?? {};
  const origin = placeId(leg.originPlaceId);
  const destination = placeId(leg.destinationPlaceId);
  const departureDate = datePart(leg.date, { year: 2026, month: 6, day: 1 });
  const currency = query.currency ?? 'GBP';
  const market = query.market ?? 'UK';
  const itineraryId = `itinerary_${origin}_${destination}_001`;
  const legId = `leg_${origin}_${destination}_001`;
  const segmentId = `segment_${origin}_${destination}_001`;
  const priceAmount = currency === 'USD' ? '479.00' : '389.00';

  return {
    results: {
      itineraries: {
        [itineraryId]: {
          legIds: [legId],
          pricingOptions: [
            {
              id: `pricing_${sessionToken}`,
              agentIds: ['skyscanner'],
              price: { amount: priceAmount, unit: currency, updateStatus: 'PRICE_UPDATE_STATUS_CURRENT' },
              items: [
                {
                  agentId: 'skyscanner',
                  price: { amount: priceAmount, unit: currency, updateStatus: 'PRICE_UPDATE_STATUS_CURRENT' },
                  deepLink: `${current.baseUrl}/redirect/${sessionToken}/${itineraryId}`,
                },
              ],
              transferType: 'TRANSFER_TYPE_MANAGED',
            },
          ],
        },
      },
      legs: {
        [legId]: {
          originPlaceId: origin,
          destinationPlaceId: destination,
          departureDateTime: dateTime(departureDate, 9, 35),
          arrivalDateTime: dateTime(departureDate, 12, 30),
          durationInMinutes: 475,
          stopCount: 0,
          marketingCarrierIds: ['BA'],
          operatingCarrierIds: ['BA'],
          segmentIds: [segmentId],
        },
      },
      segments: {
        [segmentId]: {
          originPlaceId: origin,
          destinationPlaceId: destination,
          departureDateTime: dateTime(departureDate, 9, 35),
          arrivalDateTime: dateTime(departureDate, 12, 30),
          durationInMinutes: 475,
          marketingCarrierId: 'BA',
          operatingCarrierId: 'BA',
          marketingFlightNumber: '117',
        },
      },
      places: current.airports,
      carriers: current.carriers,
      agents: current.agents,
    },
    sortingOptions: {
      best: [{ itineraryId, score: 0.982 }],
      cheapest: [{ itineraryId, score: Number(priceAmount) }],
      fastest: [{ itineraryId, score: 475 }],
    },
    stats: { itineraries: { totalCount: 1 }, carriers: { totalCount: 1 }, stops: { direct: 1 } },
    context: { status: 'complete', market },
  };
}

function resultPayload(session) {
  return {
    sessionToken: session.sessionToken,
    status: session.status,
    action: session.action,
    content: session.content,
  };
}

export const plugin = {
  name: 'skyscanner',
  register(app, store) {
    app.post('/apiservices/v3/flights/live/search/create', async (c) => {
      const authError = requireApiKey(c);
      if (authError) return c.json(authError.body, authError.status);

      const body = await readBody(c);
      const query = body.query ?? {};
      if (!Array.isArray(query.queryLegs) || query.queryLegs.length === 0) {
        const error = rpcStatus('query.queryLegs must contain at least one leg');
        return c.json(error.body, error.status);
      }

      const current = state(store);
      const sessionToken = `skyscanner_live_${String(Object.keys(current.sessions).length + 1).padStart(6, '0')}`;
      const session = {
        sessionToken,
        createdAt: fixedNow,
        query,
        status: 'RESULT_STATUS_COMPLETE',
        action: 'RESULT_ACTION_REPLACED',
        content: buildContent(current, query, sessionToken),
      };
      current.sessions[sessionToken] = session;
      setState(store, stateKey, current);
      return c.json(resultPayload(session));
    });

    app.post('/apiservices/v3/flights/live/search/poll/:sessionToken', (c) => {
      const authError = requireApiKey(c);
      if (authError) return c.json(authError.body, authError.status);

      const session = state(store).sessions[c.req.param('sessionToken')];
      if (!session) {
        const error = rpcStatus('Search session not found', 404, 5);
        return c.json(error.body, error.status);
      }
      return c.json(resultPayload(session));
    });

    app.post('/apiservices/v3/flights/live/itineraryrefresh/create/:sessionToken', async (c) => {
      const authError = requireApiKey(c);
      if (authError) return c.json(authError.body, authError.status);

      const current = state(store);
      const session = current.sessions[c.req.param('sessionToken')];
      if (!session) {
        const error = rpcStatus('Search session not found', 404, 5);
        return c.json(error.body, error.status);
      }
      const body = await readBody(c);
      const refreshSessionToken = `skyscanner_refresh_${String(Object.keys(current.refreshSessions).length + 1).padStart(6, '0')}`;
      current.refreshSessions[refreshSessionToken] = {
        refreshSessionToken,
        sessionToken: session.sessionToken,
        itineraryId: body.itineraryId,
        status: 'RESULT_STATUS_COMPLETE',
        content: session.content,
      };
      setState(store, stateKey, current);
      return c.json({ refreshSessionToken, status: 'RESULT_STATUS_COMPLETE' });
    });

    app.get('/apiservices/v3/flights/live/itineraryrefresh/poll/:refreshSessionToken', (c) => {
      const authError = requireApiKey(c);
      if (authError) return c.json(authError.body, authError.status);

      const refresh = state(store).refreshSessions[c.req.param('refreshSessionToken')];
      if (!refresh) {
        const error = rpcStatus('Refresh session not found', 404, 5);
        return c.json(error.body, error.status);
      }
      return c.json({
        refreshSessionToken: refresh.refreshSessionToken,
        status: refresh.status,
        action: 'RESULT_ACTION_REPLACED',
        content: refresh.content,
      });
    });

    app.get('/skyscanner/inspect/state', (c) => c.json(state(store)));
  },
};

export default plugin;
