import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'fidelity');

const token = await harness.call('POST', '/wpx/oauth2/token', 'grant_type=client_credentials', { 'content-type': 'application/x-www-form-urlencoded' });
assert.equal(token.payload.token_type, 'Bearer');

const participants = await harness.call('GET', '/wpx/hrp/v1/participants');
assert.equal(participants.payload.data[0].participantId, 'P000000001');

const participant = await harness.call('GET', '/wpx/hrp/v1/participants/P000000001');
assert.equal(participant.payload.employerId, 'FID-PLAN-001');

const balances = await harness.call('GET', '/wpx/wi/v1/participants/P000000001/balances');
assert.equal(balances.payload.totalBalance.currency, 'USD');
assert.equal(balances.payload.plans[0].planType, 'RETIREMENT');

const payStatements = await harness.call('GET', '/wpx/hrp/v1/participants/P000000001/pay-statements');
assert.equal(payStatements.payload.data[0].payStatementId, 'PAY-2026-001');

const created = await harness.call('POST', '/wpx/hrp/v1/participants', { firstName: 'Ada', lastName: 'Lovelace' });
assert.equal(created.status, 201);
assert.equal(created.payload.participantId, 'P000000002');

console.log('fidelity smoke ok');
