import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'progressive');

const policies = await harness.call('GET', '/v1/policies');
assert.equal(policies.payload.data[0].policyNumber, 'PGR-PA-0001');

const quote = await harness.call('POST', '/v1/quotes/auto', { zipCode: '44114', driverCount: 1 });
assert.equal(quote.status, 201);
assert.equal(quote.payload.status, 'rated');

const claim = await harness.call('POST', '/v1/claims', { policyId: 'pol_prog_auto', lossType: 'roadside' });
assert.equal(claim.payload.status, 'received');

console.log('progressive smoke ok');
