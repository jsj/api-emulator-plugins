import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'interactive-brokers');

const token = await harness.call('POST', '/oauth2/api/v1/token', 'grant_type=client_credentials', { 'content-type': 'application/x-www-form-urlencoded' });
assert.equal(token.payload.token_type, 'Bearer');

const status = await harness.call('GET', '/iserver/auth/status');
assert.equal(status.payload.authenticated, true);

const iServerAccounts = await harness.call('GET', '/iserver/accounts');
assert.equal(iServerAccounts.payload.selectedAccount, 'U1234567');

const portfolioAccounts = await harness.call('GET', '/portfolio/accounts');
assert.equal(portfolioAccounts.payload[0].accountId, 'U1234567');

const positions = await harness.call('GET', '/portfolio/U1234567/positions/0');
assert.equal(positions.payload[0].contractDesc, 'AAPL');

const ledger = await harness.call('GET', '/portfolio/U1234567/ledger');
assert.equal(ledger.payload.USD.cashbalance, 25000);

const summary = await harness.call('GET', '/portfolio/U1234567/summary');
assert.equal(summary.payload.netliquidation.currency, 'USD');

const search = await harness.call('GET', '/iserver/secdef/search?symbol=AAPL');
assert.equal(search.payload[0].conid, 265598);

const snapshot = await harness.call('GET', '/iserver/marketdata/snapshot?conids=265598');
assert.equal(snapshot.payload[0]._55, 'AAPL');

const order = await harness.call('POST', '/iserver/account/U1234567/orders', { orders: [{ conid: 272093, ticker: 'MSFT', side: 'BUY', orderType: 'MKT', quantity: 1 }] });
assert.equal(order.payload[0].order_status, 'Submitted');

const orders = await harness.call('GET', '/iserver/account/orders?accountId=U1234567');
assert.equal(orders.payload.orders[0].ticker, 'MSFT');

console.log('interactive-brokers smoke ok');
