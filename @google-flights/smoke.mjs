import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'google-flights');

const airports = await harness.call('GET', '/v1/airports');
assert.equal(airports.payload.airports[0].code, 'SFO');

const search = await harness.call('POST', '/v1/flights:search', { origin: 'SFO', destination: 'JFK' });
assert.equal(search.payload.flights[0].id, 'flt_001');

const insight = await harness.call('POST', '/v1/priceInsights:query', {});
assert.equal(insight.payload.recommendation, 'book_now');

const state = await harness.call('GET', '/google-flights/inspect/state');
assert.ok(state.payload.collections);

console.log('google-flights smoke ok');
