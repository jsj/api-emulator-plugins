import { createToken, fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'schwab:state';

function defaultState(baseUrl = 'https://api.schwabapi.com') {
  return {
    baseUrl,
    tokenCount: 0,
    accountNumbers: [{ accountNumber: '123456789', hashValue: 'SCHWAB_HASH_1' }],
    accounts: [{ securitiesAccount: { accountNumber: '123456789', type: 'MARGIN', currentBalances: { cashBalance: 50000, liquidationValue: 75000 }, positions: [{ instrument: { symbol: 'AAPL', assetType: 'EQUITY' }, longQuantity: 10, marketValue: 1900 }] } }],
    orders: [{ orderId: 1001, status: 'FILLED', enteredTime: fixedNow, orderLegCollection: [{ instrument: { symbol: 'AAPL', assetType: 'EQUITY' }, instruction: 'BUY', quantity: 1 }] }],
    quotes: { AAPL: { assetMainType: 'EQUITY', symbol: 'AAPL', quote: { bidPrice: 190, askPrice: 190.05, lastPrice: 190.02 } } },
    nextOrderId: 1002,
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);

export function seedFromConfig(store, baseUrl = 'https://api.schwabapi.com', config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'schwab',
  source: 'Charles Schwab Trader API documentation-informed subset',
  docs: 'https://developer.schwab.com/products/trader-api--individual',
  baseUrl: 'https://api.schwabapi.com',
  scope: ['oauth2_token', 'account_numbers', 'accounts', 'orders', 'marketdata_quotes', 'option_chains'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'schwab',
  register(app, store) {
    app.post('/v1/oauth/token', (c) => {
      const s = state(store);
      s.tokenCount += 1;
      return c.json({ access_token: createToken('schwab_access', s.tokenCount), refresh_token: createToken('schwab_refresh', s.tokenCount), token_type: 'Bearer', expires_in: 1800, scope: 'api' });
    });
    app.get('/trader/v1/accounts/accountNumbers', (c) => c.json(state(store).accountNumbers));
    app.get('/trader/v1/accounts', (c) => c.json(state(store).accounts));
    app.get('/trader/v1/accounts/:accountHash/orders', (c) => c.json(state(store).orders));
    app.post('/trader/v1/accounts/:accountHash/orders', async (c) => {
      const s = state(store);
      if (!s.accountNumbers.some((account) => account.hashValue === c.req.param('accountHash'))) return routeError(c, 'Account not found', 404, 'NOT_FOUND');
      const body = await readBody(c);
      const order = { orderId: s.nextOrderId++, status: 'QUEUED', enteredTime: fixedNow, ...body };
      s.orders.push(order);
      save(store, s);
      return c.json(order, 201);
    });
    app.get('/trader/v1/accounts/:accountHash/orders/:orderId', (c) => {
      const row = state(store).orders.find((order) => String(order.orderId) === c.req.param('orderId'));
      return row ? c.json(row) : routeError(c, 'Order not found', 404, 'NOT_FOUND');
    });
    app.get('/marketdata/v1/quotes', (c) => {
      const symbols = (c.req.query('symbols') ?? c.req.query('symbol') ?? 'AAPL').split(',');
      const quotes = Object.fromEntries(symbols.map((symbol) => [symbol, state(store).quotes[symbol] ?? { symbol, quote: { lastPrice: 100 } }]));
      return c.json(quotes);
    });
    app.get('/marketdata/v1/chains', (c) => c.json({ symbol: c.req.query('symbol') ?? 'AAPL', status: 'SUCCESS', callExpDateMap: {}, putExpDateMap: {} }));
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Schwab Trader API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { schwab: { clientId: 'schwab-emulator-client' } };
export default plugin;
