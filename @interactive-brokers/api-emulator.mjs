import { createToken, fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'interactive-brokers:state';

function defaultState(baseUrl = 'https://api.ibkr.com/v1/api') {
  return {
    baseUrl,
    tokenCount: 0,
    session: { connected: true, authenticated: true, competing: false, message: '' },
    accounts: [{ accountId: 'U1234567', accountTitle: 'Emulator Individual', accountAlias: 'IBKR Emulator', accountStatus: 1, currency: 'USD', type: 'INDIVIDUAL' }],
    positions: {
      U1234567: [
        { acctId: 'U1234567', conid: 265598, contractDesc: 'AAPL', position: 10, mktPrice: 190.02, mktValue: 1900.2, currency: 'USD', avgCost: 150, assetClass: 'STK' },
      ],
    },
    ledger: {
      U1234567: { USD: { cashbalance: 25000, settledcash: 25000, buyingpower: 100000, stockmarketvalue: 1900.2, netliquidationvalue: 76900.2 } },
    },
    summary: {
      U1234567: {
        accountready: { amount: true, currency: null, isNull: false, timestamp: fixedNow },
        netliquidation: { amount: 76900.2, currency: 'USD', isNull: false, timestamp: fixedNow },
        availablefunds: { amount: 25000, currency: 'USD', isNull: false, timestamp: fixedNow },
      },
    },
    contracts: {
      AAPL: [{ conid: 265598, companyName: 'APPLE INC', symbol: 'AAPL', description: 'NASDAQ', sections: [{ secType: 'STK', exchange: 'NASDAQ' }] }],
      MSFT: [{ conid: 272093, companyName: 'MICROSOFT CORP', symbol: 'MSFT', description: 'NASDAQ', sections: [{ secType: 'STK', exchange: 'NASDAQ' }] }],
    },
    marketData: {
      265598: { conid: 265598, conidEx: '265598', _31: '190.02', _55: 'AAPL', _70: '190.05', _71: '190.00', _84: '75000000', _86: '1.25' },
      272093: { conid: 272093, conidEx: '272093', _31: '425.05', _55: 'MSFT', _70: '425.10', _71: '425.00', _84: '25000000', _86: '2.50' },
    },
    orders: [],
    nextOrderId: 1000001,
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);

function account(s, accountId) {
  return s.accounts.find((row) => row.accountId === accountId);
}

function missing(c, resource = 'Resource') {
  return routeError(c, `${resource} not found`, 404, 'not_found');
}

function parseConids(value = '265598') {
  return String(value).split(',').map((conid) => conid.trim()).filter(Boolean);
}

export function seedFromConfig(store, baseUrl = 'https://api.ibkr.com/v1/api', config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'interactive-brokers',
  source: 'Interactive Brokers Client Portal Web API documentation-informed subset',
  docs: 'https://www.interactivebrokers.com/campus/ibkr-api-page/cpapi-v1/',
  baseUrl: 'https://api.ibkr.com/v1/api',
  scope: ['oauth2_token', 'session_status', 'iserver_accounts', 'portfolio_accounts', 'positions', 'ledger', 'summary', 'contract_search', 'marketdata_snapshot', 'orders'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'interactive-brokers',
  register(app, store) {
    app.post('/oauth2/api/v1/token', (c) => {
      const s = state(store);
      s.tokenCount += 1;
      return c.json({ access_token: createToken('ibkr_access', s.tokenCount), token_type: 'Bearer', expires_in: 3600 });
    });
    app.get('/iserver/auth/status', (c) => c.json(state(store).session));
    app.post('/iserver/reauthenticate', (c) => c.json({ message: 'authenticated', ...state(store).session }));
    app.get('/iserver/accounts', (c) => {
      const s = state(store);
      return c.json({ accounts: s.accounts.map((row) => row.accountId), selectedAccount: s.accounts[0]?.accountId, acctProps: Object.fromEntries(s.accounts.map((row) => [row.accountId, { hasChildAccounts: false, supportsCashQty: true }])), aliases: Object.fromEntries(s.accounts.map((row) => [row.accountId, row.accountAlias])) });
    });
    app.get('/portfolio/accounts', (c) => c.json(state(store).accounts));
    app.get('/portfolio/subaccounts', (c) => c.json(state(store).accounts));
    app.get('/portfolio/:accountId/positions/:pageId', (c) => {
      const s = state(store);
      if (!account(s, c.req.param('accountId'))) return missing(c, 'Account');
      return c.json(s.positions[c.req.param('accountId')] ?? []);
    });
    app.get('/portfolio/:accountId/ledger', (c) => {
      const s = state(store);
      if (!account(s, c.req.param('accountId'))) return missing(c, 'Account');
      return c.json(s.ledger[c.req.param('accountId')] ?? {});
    });
    app.get('/portfolio/:accountId/summary', (c) => {
      const s = state(store);
      if (!account(s, c.req.param('accountId'))) return missing(c, 'Account');
      return c.json(s.summary[c.req.param('accountId')] ?? {});
    });
    app.get('/iserver/secdef/search', (c) => {
      const symbol = String(c.req.query('symbol') ?? 'AAPL').toUpperCase();
      return c.json(state(store).contracts[symbol] ?? [{ conid: 999999, companyName: `${symbol} EMULATOR`, symbol, description: 'SMART', sections: [{ secType: 'STK', exchange: 'SMART' }] }]);
    });
    app.get('/iserver/marketdata/snapshot', (c) => {
      const s = state(store);
      return c.json(parseConids(c.req.query('conids')).map((conid) => s.marketData[conid] ?? { conid: Number(conid), conidEx: conid, _31: '100.00', _55: `EMU${conid}` }));
    });
    app.get('/iserver/account/orders', (c) => c.json({ orders: state(store).orders, snapshot: true }));
    app.post('/iserver/account/:accountId/orders', async (c) => {
      const s = state(store);
      if (!account(s, c.req.param('accountId'))) return missing(c, 'Account');
      const body = await readBody(c);
      const requestOrders = Array.isArray(body.orders) ? body.orders : [body];
      const orders = requestOrders.map((requestOrder) => {
        const order = {
          acct: c.req.param('accountId'),
          order_id: String(s.nextOrderId++),
          local_order_id: requestOrder.cOID ?? requestOrder.order_ref ?? `emu-${s.nextOrderId}`,
          conid: requestOrder.conid ?? 265598,
          ticker: requestOrder.ticker ?? 'AAPL',
          side: requestOrder.side ?? 'BUY',
          orderType: requestOrder.orderType ?? 'MKT',
          totalQuantity: requestOrder.quantity ?? requestOrder.totalQuantity ?? 1,
          status: 'Submitted',
          submittedTime: fixedNow,
        };
        s.orders.push(order);
        return { order_id: order.order_id, local_order_id: order.local_order_id, order_status: order.status };
      });
      save(store, s);
      return c.json(orders, 200);
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Interactive Brokers Client Portal API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { 'interactive-brokers': { clientId: 'ibkr-emulator-client' } };
export default plugin;
