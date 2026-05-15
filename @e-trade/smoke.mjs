import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'e-trade');

const requestToken = await harness.call('GET', '/oauth/request_token');
assert.match(requestToken.payload, /oauth_callback_confirmed=true/);

const accounts = await harness.call('GET', '/v1/accounts/list.json');
assert.equal(accounts.payload.AccountListResponse.accounts.account[0].accountIdKey, 'ETRADE_KEY_1');

const balance = await harness.call('GET', '/v1/accounts/ETRADE_KEY_1/balance.json?instType=BROKERAGE&realTimeNAV=true');
assert.equal(balance.payload.BalanceResponse.accountId, '10000001');

const portfolio = await harness.call('GET', '/v1/accounts/ETRADE_KEY_1/portfolio.json?count=10');
assert.equal(portfolio.payload.PortfolioResponse.AccountPortfolio[0].Position[0].Product.symbol, 'AAPL');

const quote = await harness.call('GET', '/v1/market/quote/AAPL.json?detailFlag=ALL');
assert.equal(quote.payload.QuoteResponse.QuoteData[0].Product.symbol, 'AAPL');

const orders = await harness.call('GET', '/v1/accounts/ETRADE_KEY_1/orders.json');
assert.equal(orders.payload.OrdersResponse.Order[0].orderId, 1000000001);

const preview = await harness.call('POST', '/v1/accounts/ETRADE_KEY_1/orders/preview.json', {
  PreviewOrderRequest: {
    orderType: 'EQ',
    clientOrderId: 'smoke-preview',
    Order: [{ priceType: 'MARKET', orderTerm: 'GOOD_FOR_DAY', marketSession: 'REGULAR', Instrument: [{ Product: { securityType: 'EQ', symbol: 'MSFT' }, orderAction: 'BUY', quantityType: 'QUANTITY', quantity: 1 }] }],
  },
});
assert.equal(preview.payload.PreviewOrderResponse.Order[0].Instrument[0].Product.symbol, 'MSFT');

console.log('e-trade smoke ok');
