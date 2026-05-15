import { fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'robinhood:state';

function defaultState(baseUrl = 'https://api.robinhood.com') {
  return {
    baseUrl,
    accounts: [{ id: 'acct_emulator', account_number: 'RH00000001', status: 'active', buying_power: '10000.00', currency: 'USD' }],
    holdings: [{ account_id: 'acct_emulator', asset_code: 'BTC', total_quantity: '0.12500000', quantity_available_for_trading: '0.12500000' }],
    currencyPairs: [{ id: 'BTC-USD', asset_currency: { code: 'BTC', name: 'Bitcoin' }, quote_currency: { code: 'USD', name: 'US Dollar' }, symbol: 'BTC-USD', tradability: 'tradable' }],
    quotes: [{ symbol: 'BTC-USD', bid_inclusive_of_sell_spread: '65000.00', ask_inclusive_of_buy_spread: '65100.00', mark_price: '65050.00' }],
    orders: [],
    nextId: 1,
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);
const page = (results) => ({ next: null, previous: null, results });
const error = (c, detail, status = 400) => c.json({ detail }, status);

function pairParam(c) {
  return c.req.query('symbol') ?? c.req.query('currency_pair_id') ?? c.req.query('asset_code') ?? 'BTC-USD';
}

export function seedFromConfig(store, baseUrl = 'https://api.robinhood.com', config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'robinhood',
  source: 'Robinhood Crypto Trading API documentation-informed subset',
  docs: 'https://docs.robinhood.com/crypto/trading/',
  baseUrl: 'https://api.robinhood.com',
  scope: ['crypto_accounts', 'crypto_holdings', 'crypto_orders', 'crypto_currency_pairs', 'crypto_marketdata'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'robinhood',
  register(app, store) {
    app.get('/api/v1/crypto/trading/accounts/', (c) => c.json(page(state(store).accounts)));
    app.get('/api/v1/crypto/trading/holdings/', (c) => c.json(page(state(store).holdings)));
    app.get('/api/v1/crypto/trading/currency_pairs/', (c) => c.json(page(state(store).currencyPairs)));
    app.get('/api/v1/crypto/trading/orders/', (c) => c.json(page(state(store).orders)));
    app.post('/api/v1/crypto/trading/orders/', async (c) => {
      const s = state(store);
      const body = await readBody(c);
      const order = {
        id: `order_${String(s.nextId++).padStart(6, '0')}`,
        account_id: body.account_id ?? s.accounts[0].id,
        currency_pair_id: body.currency_pair_id ?? body.symbol ?? 'BTC-USD',
        side: body.side ?? 'buy',
        type: body.type ?? 'market',
        quantity: body.quantity ?? '0.00100000',
        state: 'queued',
        created_at: fixedNow,
        updated_at: fixedNow,
      };
      s.orders.push(order);
      save(store, s);
      return c.json(order, 201);
    });
    app.get('/api/v1/crypto/trading/orders/:id/', (c) => {
      const row = state(store).orders.find((order) => order.id === c.req.param('id'));
      return row ? c.json(row) : error(c, 'Not found.', 404);
    });
    app.get('/api/v1/crypto/marketdata/best_bid_ask/', (c) => {
      const symbol = pairParam(c);
      return c.json({ results: state(store).quotes.filter((quote) => quote.symbol === symbol || symbol === 'BTC') });
    });
    app.get('/api/v1/crypto/marketdata/estimated_price/', (c) => {
      const quote = state(store).quotes.find((row) => row.symbol === pairParam(c)) ?? state(store).quotes[0];
      return c.json({ results: [{ symbol: quote.symbol, side: c.req.query('side') ?? 'bid', price: quote.mark_price, quantity: c.req.query('quantity') ?? '0.00100000' }] });
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Robinhood Crypto API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { robinhood: { apiKey: 'robinhood-emulator-key' } };
export default plugin;
