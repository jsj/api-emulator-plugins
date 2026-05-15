import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'flightradar24');

const headers = { authorization: 'Bearer fr24-test-token', 'accept-version': 'v1' };

const missingAuth = await harness.call('GET', '/api/live/flight-positions/light?bounds=52,50,-1,1');
assert.equal(missingAuth.status, 401);
assert.equal(missingAuth.payload.message, 'Unauthenticated');

const missingFilter = await harness.call('GET', '/api/live/flight-positions/light', undefined, headers);
assert.equal(missingFilter.status, 400);
assert.equal(missingFilter.payload.details, 'At least one query filter is required');

const liveLight = await harness.call('GET', '/api/live/flight-positions/light?bounds=52,50,-1,1', undefined, headers);
assert.equal(liveLight.status, 200);
assert.equal(liveLight.payload.data[0].fr24_id, '391fdd79');
assert.equal(liveLight.payload.data[0].callsign, 'BAW117');
assert.equal(liveLight.payload.data[0].flight, undefined);

const liveFull = await harness.call('GET', '/api/live/flight-positions/full?flights=BA117', undefined, headers);
assert.equal(liveFull.payload.data[0].flight, 'BA117');
assert.equal(liveFull.payload.data[0].dest_iata, 'JFK');

const count = await harness.call('GET', '/api/live/flight-positions/count?bounds=52,50,-1,1', undefined, headers);
assert.equal(count.payload.record_count, 1);

const airport = await harness.call('GET', '/api/static/airports/LHR/full', undefined, headers);
assert.equal(airport.payload.icao, 'EGLL');
assert.equal(airport.payload.city, 'London');

const airline = await harness.call('GET', '/api/static/airlines/BAW/light', undefined, headers);
assert.equal(airline.payload.iata, 'BA');

const tracks = await harness.call('GET', '/api/flight-tracks?flight_id=391fdd79', undefined, headers);
assert.equal(tracks.payload.tracks.length, 3);

const summary = await harness.call('GET', '/api/flight-summary/full?flight_ids=391fdd79', undefined, headers);
assert.equal(summary.payload.data[0].reg, 'G-YMMU');

const state = await harness.call('GET', '/flightradar24/inspect/state');
assert.equal(state.payload.flights[0].orig_iata, 'LHR');

console.log('flightradar24 smoke ok');
