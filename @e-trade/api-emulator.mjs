import { createToken, fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'e-trade:state';

function defaultState(baseUrl = 'https://apisb.etrade.com') {
  const account = {
    accountId: '10000001',
    accountIdKey: 'ETRADE_KEY_1',
    accountMode: 'MARGIN',
    accountDesc: 'Brokerage',
    accountName: 'Emulator Brokerage',
    accountType: 'MARGIN',
    institutionType: 'BROKERAGE',
    accountStatus: 'ACTIVE',
    closedDate: 0,
  };
  return {
    baseUrl,
    tokenCount: 0,
    accounts: [account],
    balances: {
      [account.accountIdKey]: {
        accountId: account.accountId,
        accountType: account.accountType,
        optionLevel: 'LEVEL_2',
        accountDescription: account.accountDesc,
        quoteMode: 'STREAMING',
        accountMode: account.accountMode,
        Cash: { fundsForOpenOrdersCash: 0, moneyMktBalance: 25000, cashAvailableForInvestment: 25000, netCash: 25000 },
        Computed: { cashAvailableForWithdrawal: 25000, totalAvailableForWithdrawal: 25000, netAccountValue: 50000, marginBuyingPower: 100000 },
      },
    },
    positions: {
      [account.accountIdKey]: [
        {
          positionId: 1001,
          symbolDescription: 'APPLE INC COM',
          dateAcquired: 1704067200000,
          pricePaid: 150,
          commissions: 0,
          otherFees: 0,
          quantity: 10,
          positionIndicator: 'TYPE2',
          positionType: 'LONG',
          daysGain: 125,
          daysGainPct: 0.7,
          marketValue: 1900,
          totalCost: 1500,
          totalGain: 400,
          totalGainPct: 26.67,
          pctOfPortfolio: 3.8,
          costPerShare: 150,
          todayCommissions: 0,
          todayFees: 0,
          todayPricePaid: 0,
          todayQuantity: 0,
          adjPrevClose: 177.5,
          Product: { securityType: 'EQ', symbol: 'AAPL' },
          Quick: { lastTrade: 190, lastTradeTime: fixedNow, change: 1.25, changePct: 0.66, volume: 75000000 },
        },
      ],
    },
    quotes: {
      AAPL: {
        dateTime: '01/01/2026 00:00:00',
        dateTimeUTC: 1767225600,
        quoteStatus: 'REALTIME',
        ahFlag: 'false',
        Product: { symbol: 'AAPL', securityType: 'EQ' },
        All: { symbolDescription: 'APPLE INC COM', ask: 190.05, bid: 190, lastTrade: 190.02, changeClose: 1.25, totalVolume: 75000000 },
      },
      MSFT: {
        dateTime: '01/01/2026 00:00:00',
        dateTimeUTC: 1767225600,
        quoteStatus: 'REALTIME',
        ahFlag: 'false',
        Product: { symbol: 'MSFT', securityType: 'EQ' },
        All: { symbolDescription: 'MICROSOFT CORP COM', ask: 425.1, bid: 425, lastTrade: 425.05, changeClose: 2.5, totalVolume: 25000000 },
      },
    },
    orders: [
      {
        orderId: 1000000001,
        details: 'Buy 1 AAPL at market',
        orderType: 'EQ',
        OrderDetail: [{ placedTime: fixedNow, status: 'EXECUTED', orderTerm: 'GOOD_FOR_DAY', priceType: 'MARKET', Instrument: [{ Product: { securityType: 'EQ', symbol: 'AAPL' }, orderAction: 'BUY', quantityType: 'QUANTITY', orderedQuantity: 1, filledQuantity: 1 }] }],
      },
    ],
    previews: [],
    nextPreviewId: 2000000001,
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);
const error = (c, message, status = 400, code = 100) => c.json({ Error: { code, message } }, status);
const responseFormat = (value) => String(value ?? '').replace(/\.json$/, '');

function accountByKey(s, accountIdKey) {
  return s.accounts.find((account) => account.accountIdKey === responseFormat(accountIdKey));
}

function accountListResponse(s) {
  return { AccountListResponse: { accounts: { account: s.accounts } } };
}

function portfolioResponse(s, accountIdKey) {
  const positions = s.positions[accountIdKey] ?? [];
  return {
    PortfolioResponse: {
      AccountPortfolio: [
        {
          accountId: accountIdKey,
          totalPages: 1,
          Position: positions,
          totalNoOfPages: 1,
        },
      ],
    },
  };
}

function quoteResponse(s, symbols) {
  const rows = responseFormat(symbols)
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .map((symbol) => s.quotes[symbol] ?? { dateTime: '01/01/2026 00:00:00', quoteStatus: 'REALTIME', Product: { symbol, securityType: 'EQ' }, All: { symbolDescription: `${symbol} EMULATOR`, ask: 100.05, bid: 100, lastTrade: 100.02 } });
  return { QuoteResponse: { QuoteData: rows } };
}

function previewResponse(s, body) {
  const order = body.PreviewOrderRequest ?? body;
  const instrument = order.Order?.[0]?.Instrument?.[0] ?? order.Order?.Instrument ?? order.Instrument ?? {};
  const symbol = instrument.Product?.symbol ?? 'AAPL';
  return {
    PreviewOrderResponse: {
      previewId: s.nextPreviewId++,
      clientOrderId: order.clientOrderId ?? `emu-${s.nextPreviewId}`,
      orderType: order.orderType ?? 'EQ',
      totalOrderValue: 190.02,
      estimatedCommission: 0,
      estimatedTotalAmount: 190.02,
      Order: [
        {
          priceType: order.Order?.[0]?.priceType ?? order.Order?.priceType ?? 'MARKET',
          orderTerm: order.Order?.[0]?.orderTerm ?? order.Order?.orderTerm ?? 'GOOD_FOR_DAY',
          marketSession: order.Order?.[0]?.marketSession ?? order.Order?.marketSession ?? 'REGULAR',
          Instrument: [{ Product: { securityType: 'EQ', symbol }, orderAction: instrument.orderAction ?? 'BUY', quantityType: instrument.quantityType ?? 'QUANTITY', quantity: Number(instrument.quantity ?? 1) }],
        },
      ],
      PreviewIds: [{ previewId: s.nextPreviewId - 1 }],
      messages: { Message: [{ code: 1026, description: 'Preview order accepted by emulator', type: 'INFO' }] },
    },
  };
}

function registerAccountRoutes(app, store, suffix = '') {
  app.get(`/v1/accounts/list${suffix}`, (c) => c.json(accountListResponse(state(store))));
  app.get(`/v1/accounts/:accountIdKey/balance${suffix}`, (c) => {
    const s = state(store);
    const accountIdKey = responseFormat(c.req.param('accountIdKey'));
    if (!accountByKey(s, accountIdKey)) return error(c, 'Please enter valid account key', 400, 102);
    return c.json({ BalanceResponse: s.balances[accountIdKey] });
  });
  app.get(`/v1/accounts/:accountIdKey/portfolio${suffix}`, (c) => {
    const s = state(store);
    const accountIdKey = responseFormat(c.req.param('accountIdKey'));
    if (!accountByKey(s, accountIdKey)) return error(c, 'Please enter valid account key', 400, 102);
    return c.json(portfolioResponse(s, accountIdKey));
  });
  app.get(`/v1/accounts/:accountIdKey/orders${suffix}`, (c) => {
    const s = state(store);
    if (!accountByKey(s, c.req.param('accountIdKey'))) return error(c, 'Please enter valid account key', 400, 102);
    return c.json({ OrdersResponse: { marker: null, Order: s.orders } });
  });
  app.post(`/v1/accounts/:accountIdKey/orders/preview${suffix}`, async (c) => {
    const s = state(store);
    if (!accountByKey(s, c.req.param('accountIdKey'))) return error(c, 'Please enter valid account key', 400, 102);
    const preview = previewResponse(s, await readBody(c));
    s.previews.push(preview.PreviewOrderResponse);
    save(store, s);
    return c.json(preview);
  });
}

export function seedFromConfig(store, baseUrl = 'https://apisb.etrade.com', config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'e-trade',
  source: 'E*TRADE REST API documentation-informed subset',
  docs: 'https://apisb.etrade.com/docs/api/account/api-account-v1.html',
  baseUrl: 'https://apisb.etrade.com',
  scope: ['oauth1_tokens', 'account_list', 'account_balance', 'account_portfolio', 'market_quote', 'order_list', 'order_preview'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'e-trade',
  register(app, store) {
    app.get('/oauth/request_token', (c) => {
      const s = state(store);
      s.tokenCount += 1;
      return c.text(`oauth_token=${createToken('etrade_request', s.tokenCount)}&oauth_token_secret=${createToken('etrade_request_secret', s.tokenCount)}&oauth_callback_confirmed=true`, 200, { 'content-type': 'application/x-www-form-urlencoded' });
    });
    app.get('/oauth/access_token', (c) => {
      const s = state(store);
      s.tokenCount += 1;
      return c.text(`oauth_token=${createToken('etrade_access', s.tokenCount)}&oauth_token_secret=${createToken('etrade_access_secret', s.tokenCount)}`, 200, { 'content-type': 'application/x-www-form-urlencoded' });
    });
    app.get('/oauth/renew_access_token', (c) => c.text('oauth_token=etrade_access_renewed&oauth_token_secret=etrade_access_secret_renewed', 200, { 'content-type': 'application/x-www-form-urlencoded' }));
    app.get('/oauth/revoke_access_token', (c) => c.text('oauth_token_revoked=true', 200, { 'content-type': 'application/x-www-form-urlencoded' }));

    registerAccountRoutes(app, store);
    registerAccountRoutes(app, store, '.json');
    app.get('/v1/market/quote/:symbols', (c) => c.json(quoteResponse(state(store), c.req.param('symbols'))));
    app.get('/v1/market/quote/:symbols.json', (c) => c.json(quoteResponse(state(store), c.req.param('symbols'))));
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'E*TRADE API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { 'e-trade': { clientKey: 'etrade-emulator-key', clientSecret: 'etrade-emulator-secret' } };
export default plugin;
