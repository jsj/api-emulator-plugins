import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'usaa');

const customer = await harness.call('GET', '/fdx/v6/customers/current');
assert.equal(customer.payload.customerId, 'cust_usaa_1');

const accounts = await harness.call('GET', '/fdx/v6/accounts');
assert.equal(accounts.payload.items.length, 2);

const account = await harness.call('GET', '/fdx/v6/accounts/acct_checking_1');
assert.equal(account.payload.displayName, 'USAA Classic Checking');

const txns = await harness.call('GET', '/fdx/v6/accounts/acct_checking_1/transactions');
assert.equal(txns.payload.items[0].description, 'EMULATOR PAYROLL');

const alias = await harness.call('GET', '/accounts/acct_card_1/transactions');
assert.equal(alias.payload.items[0].accountId, 'acct_card_1');

console.log('usaa smoke ok');
