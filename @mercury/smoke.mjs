import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const headers = { authorization: 'Bearer secret-token:mercury_emulator' };
const harness = createHarness(plugin);
assert.equal(contract.provider, 'mercury');

const accounts = await harness.call('GET', '/api/v1/accounts', undefined, headers);
assert.equal(accounts.payload.accounts[0].id, 'mercury-account-1');

const account = await harness.call('GET', '/api/v1/account/mercury-account-1', undefined, headers);
assert.equal(account.payload.status, 'active');

const transactions = await harness.call('GET', '/api/v1/transactions?accountId=mercury-account-1', undefined, headers);
assert.equal(transactions.payload.transactions[0].status, 'sent');

const recipients = await harness.call('GET', '/api/v1/recipients', undefined, headers);
assert.equal(recipients.payload.recipients[0].name, 'Emulator Vendor LLC');

const recipient = await harness.call('POST', '/api/v1/recipients', { name: 'Smoke Vendor', emails: ['smoke@example.com'] }, { ...headers, 'content-type': 'application/json' });
assert.equal(recipient.status, 201);
assert.equal(recipient.payload.name, 'Smoke Vendor');

const approval = await harness.call('POST', '/api/v1/account/mercury-account-1/request-send-money', { amount: 25, recipientId: recipient.payload.id }, { ...headers, 'content-type': 'application/json' });
assert.equal(approval.payload.status, 'pendingApproval');

console.log('mercury smoke ok');
