import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'statefarm');

const quote = await harness.call('POST', '/v1/quotes/renters', { postalCode: '60601', propertyType: 'apartment' });
assert.equal(quote.status, 201);
assert.equal(quote.payload.status, 'quoted');

const policies = await harness.call('GET', '/v1/policies');
assert.equal(policies.payload.items[0].policyNumber, 'SF-R-0001');

const claim = await harness.call('POST', '/v1/claims', { policyId: 'pol_sf_renters', lossType: 'water' });
assert.equal(claim.payload.status, 'received');

const bills = await harness.call('GET', '/v1/billing/bills');
assert.equal(bills.payload.items[0].status, 'scheduled');

console.log('statefarm smoke ok');
