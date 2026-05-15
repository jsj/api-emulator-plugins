import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
const auth = { authorization: 'Bearer bilt_emulator_token', 'content-type': 'application/json' };

assert.equal(contract.provider, 'bilt');

const unauthenticated = await harness.call('GET', '/v1/member');
assert.equal(unauthenticated.status, 401);

const member = await harness.call('GET', '/v1/member', undefined, auth);
assert.equal(member.payload.data.pointsBalance, 12500);

const accounts = await harness.call('GET', '/v1/rewards/accounts', undefined, auth);
assert.equal(accounts.payload.data[0].type, 'BILT_REWARDS');

const ledger = await harness.call('GET', '/v1/rewards/ledger?account_id=rw_bilt_001', undefined, auth);
assert.equal(ledger.payload.pagination.total, 2);

const created = await harness.call('POST', '/v1/rent-payments', { propertyName: 'Smoke Test Towers', amount: { value: '1999.00', currency: 'USD' } }, auth);
assert.equal(created.status, 201);
assert.equal(created.payload.data.status, 'scheduled');

const payments = await harness.call('GET', '/v1/rent-payments', undefined, auth);
assert.equal(payments.payload.pagination.total, 2);

console.log('bilt smoke ok');
