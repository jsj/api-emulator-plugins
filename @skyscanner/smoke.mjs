import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'skyscanner');

const query = {
  query: {
    market: 'UK',
    locale: 'en-GB',
    currency: 'GBP',
    queryLegs: [
      {
        originPlaceId: { iata: 'LHR' },
        destinationPlaceId: { iata: 'JFK' },
        date: { year: 2026, month: 6, day: 1 },
      },
    ],
    adults: 1,
    cabinClass: 'CABIN_CLASS_ECONOMY',
  },
};

const missingAuth = await harness.call('POST', '/apiservices/v3/flights/live/search/create', query);
assert.equal(missingAuth.status, 401);
assert.equal(missingAuth.payload.message, 'Missing x-api-key header');

const create = await harness.call('POST', '/apiservices/v3/flights/live/search/create', query, { 'x-api-key': 'test-key' });
assert.equal(create.status, 200);
assert.match(create.payload.sessionToken, /^skyscanner_live_/);
assert.equal(create.payload.status, 'RESULT_STATUS_COMPLETE');
assert.equal(create.payload.action, 'RESULT_ACTION_REPLACED');
assert.ok(create.payload.content.results.itineraries.itinerary_LHR_JFK_001);
assert.equal(create.payload.content.results.legs.leg_LHR_JFK_001.marketingCarrierIds[0], 'BA');

const poll = await harness.call(
  'POST',
  `/apiservices/v3/flights/live/search/poll/${create.payload.sessionToken}`,
  undefined,
  { 'x-api-key': 'test-key' },
);
assert.equal(poll.payload.sessionToken, create.payload.sessionToken);
assert.equal(poll.payload.content.sortingOptions.best[0].itineraryId, 'itinerary_LHR_JFK_001');

const refresh = await harness.call(
  'POST',
  `/apiservices/v3/flights/live/itineraryrefresh/create/${create.payload.sessionToken}`,
  { itineraryId: 'itinerary_LHR_JFK_001' },
  { 'x-api-key': 'test-key' },
);
assert.match(refresh.payload.refreshSessionToken, /^skyscanner_refresh_/);

const refreshPoll = await harness.call(
  'GET',
  `/apiservices/v3/flights/live/itineraryrefresh/poll/${refresh.payload.refreshSessionToken}`,
  undefined,
  { 'x-api-key': 'test-key' },
);
assert.equal(refreshPoll.payload.status, 'RESULT_STATUS_COMPLETE');

const state = await harness.call('GET', '/skyscanner/inspect/state');
assert.equal(Object.keys(state.payload.sessions).length, 1);

console.log('skyscanner smoke ok');
