import { fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'coinbase:state';

function defaultState(baseUrl = 'https://api.coinbase.com') {
  return {
    baseUrl,
    accounts: [
      {
        uuid: 'coinbase-account-btc',
        name: 'BTC Wallet',
        currency: 'BTC',
        available_balance: { value: '0.25000000', currency: 'BTC' },
        default: true,
        active: true,
        created_at: fixedNow,
        updated_at: fixedNow,
        deleted_at: null,
        type: 'ACCOUNT_TYPE_CRYPTO',
        ready: true,
        hold: { value: '0.00000000', currency: 'BTC' },
        retail_portfolio_id: 'coinbase-portfolio-1',
        platform: 'ACCOUNT_PLATFORM_CONSUMER',
      },
      {
        uuid: 'coinbase-account-usd',
        name: 'USD Wallet',
        currency: 'USD',
        available_balance: { value: '10000.00', currency: 'USD' },
        default: false,
        active: true,
        created_at: fixedNow,
        updated_at: fixedNow,
        deleted_at: null,
        type: 'ACCOUNT_TYPE_FIAT',
        ready: true,
        hold: { value: '0.00', currency: 'USD' },
        retail_portfolio_id: 'coinbase-portfolio-1',
        platform: 'ACCOUNT_PLATFORM_CONSUMER',
      },
    ],
    products: [
      {
        product_id: 'BTC-USD',
        price: '65000.00',
        price_percentage_change_24h: '1.23',
        volume_24h: '1250.5',
        volume_percentage_change_24h: '3.4',
        base_increment: '0.00000001',
        quote_increment: '0.01',
        quote_min_size: '1',
        quote_max_size: '1000000',
        base_min_size: '0.00000001',
        base_max_size: '1000',
        base_name: 'Bitcoin',
        quote_name: 'US Dollar',
        watched: false,
        is_disabled: false,
        new: false,
        status: 'online',
        cancel_only: false,
        limit_only: false,
        post_only: false,
        trading_disabled: false,
        auction_mode: false,
        product_type: 'SPOT',
        quote_currency_id: 'USD',
        base_currency_id: 'BTC',
      },
      {
        product_id: 'ETH-USD',
        price: '3200.00',
        price_percentage_change_24h: '0.75',
        volume_24h: '9800.1',
        volume_percentage_change_24h: '1.1',
        base_increment: '0.00000001',
        quote_increment: '0.01',
        quote_min_size: '1',
        quote_max_size: '1000000',
        base_min_size: '0.00000001',
        base_max_size: '1000',
        base_name: 'Ethereum',
        quote_name: 'US Dollar',
        watched: false,
        is_disabled: false,
        new: false,
        status: 'online',
        cancel_only: false,
        limit_only: false,
        post_only: false,
        trading_disabled: false,
        auction_mode: false,
        product_type: 'SPOT',
        quote_currency_id: 'USD',
        base_currency_id: 'ETH',
      },
    ],
    orders: [
      {
        order_id: 'coinbase-order-1',
        product_id: 'BTC-USD',
        user_id: 'coinbase-user-1',
        order_configuration: { market_market_ioc: { quote_size: '100.00' } },
        side: 'BUY',
        client_order_id: 'coinbase-client-order-1',
        status: 'FILLED',
        time_in_force: 'IMMEDIATE_OR_CANCEL',
        created_time: fixedNow,
        completion_percentage: '100',
        filled_size: '0.00153846',
        average_filled_price: '65000.00',
        fee: '0.60',
        number_of_fills: '1',
        filled_value: '100.00',
        pending_cancel: false,
        size_in_quote: true,
        total_fees: '0.60',
        size_inclusive_of_fees: false,
        total_value_after_fees: '100.60',
        trigger_status: 'INVALID_ORDER_TYPE',
        order_type: 'MARKET',
        reject_reason: 'REJECT_REASON_UNSPECIFIED',
        settled: true,
        product_type: 'SPOT',
        reject_message: '',
        cancel_message: '',
        order_placement_source: 'RETAIL_ADVANCED',
      },
    ],
    previews: [],
    nextPreviewId: 1,
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);
const error = (c, status, code, message) => c.json({ error: code, error_details: message, message }, status);

function requireBearer(c) {
  return /^Bearer\s+\S+/i.test(c.req.header?.('authorization') ?? c.req.header?.('Authorization') ?? '');
}

function accountPage(accounts) {
  return { accounts, has_next: false, cursor: '', size: accounts.length };
}

function productPage(products) {
  return { products, num_products: products.length, pagination: { prev_cursor: '', next_cursor: '', has_next: false, has_prev: false } };
}

function orderPage(orders) {
  return { orders, has_next: false, cursor: '', sequence: '0', proof_token_required: false };
}

function previewOrder(s, body) {
  const productId = body.product_id ?? 'BTC-USD';
  const side = body.side ?? 'BUY';
  const configuration = body.order_configuration ?? { market_market_ioc: { quote_size: '100.00' } };
  const preview = {
    preview_id: `coinbase-preview-${String(s.nextPreviewId++).padStart(6, '0')}`,
    product_id: productId,
    side,
    order_configuration: configuration,
    quote_size: configuration.market_market_ioc?.quote_size ?? configuration.limit_limit_gtc?.quote_size ?? '100.00',
    base_size: configuration.market_market_ioc?.base_size ?? configuration.limit_limit_gtc?.base_size ?? '',
    best_bid: '64999.99',
    best_ask: '65000.00',
    commission_total: { value: '0.60', currency: 'USD' },
    errs: [],
    warning: [],
    order_total: { value: '100.60', currency: 'USD' },
    quote_size_inclusive_of_fees: false,
  };
  s.previews.push(preview);
  return { order_total: preview.order_total, commission_total: preview.commission_total, errs: [], warning: [], preview_id: preview.preview_id };
}

export function seedFromConfig(store, baseUrl = 'https://api.coinbase.com', config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'coinbase',
  source: 'Coinbase Advanced Trade API documentation-informed subset',
  docs: 'https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rest-api',
  baseUrl: 'https://api.coinbase.com',
  scope: ['advanced_trade_products', 'advanced_trade_accounts', 'advanced_trade_historical_orders', 'advanced_trade_order_preview'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'coinbase',
  register(app, store) {
    app.get('/api/v3/brokerage/time', (c) => c.json({ iso: fixedNow, epochSeconds: String(Math.floor(new Date(fixedNow).getTime() / 1000)), epochMillis: String(new Date(fixedNow).getTime()) }));
    app.get('/api/v3/brokerage/market/products', (c) => c.json(productPage(state(store).products)));
    app.get('/api/v3/brokerage/market/products/:productId', (c) => {
      const product = state(store).products.find((row) => row.product_id === c.req.param('productId'));
      return product ? c.json({ product }) : error(c, 404, 'NOT_FOUND', 'Product not found');
    });
    app.get('/api/v3/brokerage/accounts', (c) => {
      if (!requireBearer(c)) return error(c, 401, 'UNAUTHENTICATED', 'Authentication required');
      return c.json(accountPage(state(store).accounts));
    });
    app.get('/api/v3/brokerage/accounts/:accountUuid', (c) => {
      if (!requireBearer(c)) return error(c, 401, 'UNAUTHENTICATED', 'Authentication required');
      const account = state(store).accounts.find((row) => row.uuid === c.req.param('accountUuid'));
      return account ? c.json({ account }) : error(c, 404, 'NOT_FOUND', 'Account not found');
    });
    app.get('/api/v3/brokerage/orders/historical/batch', (c) => {
      if (!requireBearer(c)) return error(c, 401, 'UNAUTHENTICATED', 'Authentication required');
      return c.json(orderPage(state(store).orders));
    });
    app.post('/api/v3/brokerage/orders/preview', async (c) => {
      if (!requireBearer(c)) return error(c, 401, 'UNAUTHENTICATED', 'Authentication required');
      const s = state(store);
      const response = previewOrder(s, await readBody(c));
      save(store, s);
      return c.json(response);
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Coinbase Advanced Trade API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { coinbase: { apiKey: 'coinbase-emulator-key', apiSecret: 'coinbase-emulator-secret' } };
export default plugin;
