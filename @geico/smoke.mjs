import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'geico');

const customer = await harness.call('GET', '/v1/customers/current');
assert.equal(customer.payload.id, 'cust_geico_1');

const policies = await harness.call('GET', '/v1/policies');
assert.equal(policies.payload.data[0].policyNumber, 'GEICO-AUTO-0001');

const claim = await harness.call('POST', '/v1/claims', { policyId: 'pol_geico_auto', lossType: 'glass', lossDate: '2026-03-01' });
assert.equal(claim.status, 201);
assert.equal(claim.payload.status, 'received');

const quote = await harness.call('POST', '/v1/quotes/auto', { zipCode: '94107', vehicles: [{ year: 2024, make: 'Honda' }] });
assert.equal(quote.payload.status, 'quoted');

const invoices = await harness.call('GET', '/v1/billing/invoices');
assert.equal(invoices.payload.data[0].status, 'due');

console.log('geico smoke ok');
