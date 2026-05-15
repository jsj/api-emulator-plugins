import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'lemonade');

const customer = await harness.call('POST', '/v1/customers', { email: 'grace@example.test', first_name: 'Grace' });
assert.equal(customer.status, 201);

const quote = await harness.call('POST', '/v1/quotes/renters', { customer_id: customer.payload.id, address: { postal_code: '10001' } });
assert.equal(quote.payload.status, 'quoted');

const policy = await harness.call('POST', '/v1/policies', { quote_id: quote.payload.id, product: 'renters' });
assert.equal(policy.status, 201);
assert.equal(policy.payload.status, 'active');

const fetched = await harness.call('GET', `/v1/policies/${policy.payload.id}`);
assert.equal(fetched.payload.quote_id, quote.payload.id);

console.log('lemonade smoke ok');
