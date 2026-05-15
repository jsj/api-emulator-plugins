import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
const auth = { authorization: 'Bearer duke_energy_emulator_token', 'content-type': 'application/json' };

assert.equal(contract.provider, 'duke-energy');

const rejectedToken = await harness.call('POST', '/login/auth-token', {}, { 'content-type': 'application/json' });
assert.equal(rejectedToken.status, 400);

const token = await harness.call('POST', '/login/auth-token', { id_token: 'dummy-auth0-id-token' }, { 'content-type': 'application/json' });
assert.equal(token.payload.access_token, 'duke_energy_emulator_token');

const unauthenticated = await harness.call('GET', '/account-list');
assert.equal(unauthenticated.status, 401);

const accounts = await harness.call('GET', '/account-list', undefined, auth);
assert.equal(accounts.payload.accounts[0].accountNumber, '3000000001');

const details = await harness.call('GET', '/account-details-v2?accountNumber=3000000001', undefined, auth);
assert.equal(details.payload.balance.amount, '124.50');

const usage = await harness.call('POST', '/account/usage/graph', { accountNumber: '3000000001', interval: 'daily' }, auth);
assert.equal(usage.payload.usage.length, 3);
assert.equal(usage.payload.usage[0].unit, 'kWh');

console.log('duke-energy smoke ok');
