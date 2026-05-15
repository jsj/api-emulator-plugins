import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'schwab');

const token = await harness.call('POST', '/v1/oauth/token', 'grant_type=authorization_code', { 'content-type': 'application/x-www-form-urlencoded' });
assert.equal(token.payload.token_type, 'Bearer');

const accountNumbers = await harness.call('GET', '/trader/v1/accounts/accountNumbers');
assert.equal(accountNumbers.payload[0].hashValue, 'SCHWAB_HASH_1');

const accounts = await harness.call('GET', '/trader/v1/accounts');
assert.equal(accounts.payload[0].securitiesAccount.accountNumber, '123456789');

const order = await harness.call('POST', '/trader/v1/accounts/SCHWAB_HASH_1/orders', { orderType: 'MARKET', orderLegCollection: [{ instruction: 'BUY', quantity: 1, instrument: { symbol: 'MSFT' } }] });
assert.equal(order.status, 201);
assert.equal(order.payload.status, 'QUEUED');

const quotes = await harness.call('GET', '/marketdata/v1/quotes?symbols=AAPL');
assert.equal(quotes.payload.AAPL.symbol, 'AAPL');

console.log('schwab smoke ok');
