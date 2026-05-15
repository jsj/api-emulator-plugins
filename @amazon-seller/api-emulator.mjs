import { createToken, fixedNow, getState, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'amazon-seller:state';

function defaultState() {
  return {
    tokenCount: 0,
    marketplaces: [{ marketplace: { id: 'ATVPDKIKX0DER', name: 'Amazon.com', countryCode: 'US', defaultCurrencyCode: 'USD', defaultLanguageCode: 'en_US', domainName: 'www.amazon.com' }, participation: { isParticipating: true, hasSuspendedListings: false } }],
    orders: [{ AmazonOrderId: '902-3159896-1390916', PurchaseDate: fixedNow, LastUpdateDate: fixedNow, OrderStatus: 'Unshipped', FulfillmentChannel: 'MFN', SalesChannel: 'Amazon.com', ShipServiceLevel: 'Std US D2D Dom', MarketplaceId: 'ATVPDKIKX0DER', BuyerInfo: {}, OrderTotal: { CurrencyCode: 'USD', Amount: '20.00' } }],
  };
}

const state = (store) => getState(store, STATE_KEY, defaultState);

export function seedFromConfig(store, baseUrl = 'https://sellingpartnerapi-na.amazon.com', config = {}) {
  return setState(store, STATE_KEY, { ...defaultState(), baseUrl, ...config });
}

export const contract = {
  provider: 'amazon-seller',
  source: 'Amazon Selling Partner API model subset',
  docs: 'https://developer-docs.amazon.com/sp-api',
  baseUrl: 'https://sellingpartnerapi-na.amazon.com',
  scope: ['lwa_token', 'marketplace_participations', 'orders', 'restricted_data_token'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'amazon-seller',
  register(app, store) {
    app.post('/auth/o2/token', (c) => {
      const current = state(store);
      current.tokenCount += 1;
      return c.json({ access_token: createToken('lwa_access', current.tokenCount), refresh_token: createToken('lwa_refresh', current.tokenCount), token_type: 'bearer', expires_in: 3600 });
    });
    app.get('/sellers/v1/marketplaceParticipations', (c) => c.json({ payload: state(store).marketplaces }));
    app.get('/orders/v0/orders', (c) => {
      const marketplace = c.req.query('MarketplaceIds');
      const orders = state(store).orders.filter((order) => !marketplace || order.MarketplaceId === marketplace);
      return c.json({ payload: { Orders: orders, NextToken: undefined } });
    });
    app.get('/orders/v0/orders/:orderId', (c) => {
      const order = state(store).orders.find((item) => item.AmazonOrderId === c.req.param('orderId'));
      return c.json({ payload: order ?? state(store).orders[0] });
    });
    app.post('/tokens/2021-03-01/restrictedDataToken', (c) => c.json({ restrictedDataToken: 'rdt_emulator_token', expiresIn: 3600 }));
    app.get('/amazon-seller/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Amazon Selling Partner API emulator';
export const endpoints = 'LWA token, marketplace participations, orders, restricted data token';
export const initConfig = { 'amazon-seller': { refreshToken: 'amazon-seller-refresh-token', marketplaceId: 'ATVPDKIKX0DER' } };

export default plugin;
