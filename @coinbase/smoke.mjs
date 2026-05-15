import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'coinbase');

const products = await harness.call('GET', '/api/v3/brokerage/market/products');
assert.equal(products.payload.products[0].product_id, 'BTC-USD');

const product = await harness.call('GET', '/api/v3/brokerage/market/products/ETH-USD');
assert.equal(product.payload.product.base_currency_id, 'ETH');

const unauthenticated = await harness.call('GET', '/api/v3/brokerage/accounts');
assert.equal(unauthenticated.status, 401);

const accounts = await harness.call('GET', '/api/v3/brokerage/accounts', undefined, { authorization: 'Bearer coinbase_emulator_token' });
assert.equal(accounts.payload.accounts[0].uuid, 'coinbase-account-btc');

const account = await harness.call('GET', '/api/v3/brokerage/accounts/coinbase-account-usd', undefined, { authorization: 'Bearer coinbase_emulator_token' });
assert.equal(account.payload.account.currency, 'USD');

const orders = await harness.call('GET', '/api/v3/brokerage/orders/historical/batch', undefined, { authorization: 'Bearer coinbase_emulator_token' });
assert.equal(orders.payload.orders[0].status, 'FILLED');

const preview = await harness.call(
  'POST',
  '/api/v3/brokerage/orders/preview',
  { product_id: 'BTC-USD', side: 'BUY', order_configuration: { market_market_ioc: { quote_size: '50.00' } } },
  { authorization: 'Bearer coinbase_emulator_token', 'content-type': 'application/json' },
);
assert.match(preview.payload.preview_id, /^coinbase-preview-/);

console.log('coinbase smoke ok');
