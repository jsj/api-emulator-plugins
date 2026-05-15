import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'robinhood');

const accounts = await harness.call('GET', '/api/v1/crypto/trading/accounts/');
assert.equal(accounts.payload.results[0].status, 'active');

const holdings = await harness.call('GET', '/api/v1/crypto/trading/holdings/');
assert.equal(holdings.payload.results[0].asset_code, 'BTC');

const quote = await harness.call('GET', '/api/v1/crypto/marketdata/best_bid_ask/?symbol=BTC-USD');
assert.equal(quote.payload.results[0].symbol, 'BTC-USD');

const order = await harness.call('POST', '/api/v1/crypto/trading/orders/', { currency_pair_id: 'BTC-USD', side: 'buy', quantity: '0.00200000' });
assert.equal(order.status, 201);
assert.equal(order.payload.state, 'queued');

const fetched = await harness.call('GET', `/api/v1/crypto/trading/orders/${order.payload.id}/`);
assert.equal(fetched.payload.id, order.payload.id);

console.log('robinhood smoke ok');
