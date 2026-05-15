import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'ethos');

const lead = await harness.call('POST', '/v1/leads', { email: 'grace@example.test', birth_date: '1988-01-01' });
assert.equal(lead.payload.status, 'qualified');

const quote = await harness.call('POST', '/v1/quotes/term-life', { lead_id: lead.payload.id, coverage_amount: 750000 });
assert.equal(quote.status, 201);
assert.equal(quote.payload.status, 'offered');

const application = await harness.call('POST', '/v1/applications', { quote_id: quote.payload.id });
assert.equal(application.payload.decision, 'approved');

const fetched = await harness.call('GET', `/v1/applications/${application.payload.id}`);
assert.equal(fetched.payload.quote_id, quote.payload.id);

const policies = await harness.call('GET', '/v1/policies');
assert.equal(policies.payload.data[0].policy_number, 'ETH-10001');

console.log('ethos smoke ok');
