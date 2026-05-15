import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'apple-maps');

const token = await harness.call('GET', '/v1/token');
assert.equal(token.payload.accessToken, 'apple_maps_access_emulator');

const search = await harness.call('GET', '/v1/search?q=Apple%20Park');
assert.equal(search.payload.results[0].name, 'Apple Park');

const reverse = await harness.call('GET', '/v1/reverseGeocode?loc=37.3349,-122.0090');
assert.equal(reverse.payload.results[0].id, 'apple-park');

console.log('apple-maps smoke ok');
