import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'google-maps');

const text = await harness.call('POST', '/v1/places:searchText', { textQuery: 'Apple Park' }, { 'x-goog-fieldmask': 'places.id,places.displayName' });
assert.equal(text.payload.places[0].displayName.text, 'Apple Park');
assert.equal(text.payload.places[0].formattedAddress, undefined);

const nearby = await harness.call('POST', '/v1/places:searchNearby', { includedTypes: ['cafe'] });
assert.equal(nearby.payload.places[0].displayName.text, 'Emulator Coffee');

const details = await harness.call('GET', '/v1/places/apple-park', undefined, { 'x-goog-fieldmask': 'id,formattedAddress' });
assert.equal(details.payload.formattedAddress, 'One Apple Park Way, Cupertino, CA 95014, USA');

const autocomplete = await harness.call('POST', '/v1/places:autocomplete', { input: 'coffee' });
assert.equal(autocomplete.payload.suggestions[0].placePrediction.place, 'places/coffee-emulator');

console.log('google-maps smoke ok');
