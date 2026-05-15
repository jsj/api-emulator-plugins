import { createToken, fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'ebay-seller:state';

function defaultState() {
  return {
    tokenCount: 0,
    inventory: {
      'SKU-EMULATOR-1': {
        sku: 'SKU-EMULATOR-1',
        product: { title: 'Emulator Listing', description: 'Deterministic eBay inventory item', aspects: { Brand: ['Emulator'] }, imageUrls: ['https://i.ebayimg.com/images/emulator.jpg'] },
        availability: { shipToLocationAvailability: { quantity: 5 } },
        condition: 'NEW',
      },
    },
    offers: [],
  };
}

const state = (store) => getState(store, STATE_KEY, defaultState);

export function seedFromConfig(store, baseUrl = 'https://api.sandbox.ebay.com', config = {}) {
  return setState(store, STATE_KEY, { ...defaultState(), baseUrl, ...config });
}

export const contract = {
  provider: 'ebay-seller',
  source: 'eBay Sell API OpenAPI-compatible subset',
  docs: 'https://developer.ebay.com/api-docs',
  baseUrl: 'https://api.sandbox.ebay.com',
  scope: ['oauth_token', 'sell_inventory_items', 'offers'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'ebay-seller',
  register(app, store) {
    app.post('/identity/v1/oauth2/token', (c) => {
      const current = state(store);
      current.tokenCount += 1;
      return c.json({ access_token: createToken('ebay_access', current.tokenCount), expires_in: 7200, token_type: 'Application Access Token' });
    });
    app.get('/sell/inventory/v1/inventory_item/:sku', (c) => {
      const item = state(store).inventory[c.req.param('sku')];
      if (!item) return routeError(c, 'Inventory item not found.', 404, 'NOT_FOUND');
      return c.json(item);
    });
    app.put('/sell/inventory/v1/inventory_item/:sku', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      current.inventory[c.req.param('sku')] = { sku: c.req.param('sku'), ...body };
      return c.json('', 204);
    });
    app.get('/sell/inventory/v1/inventory_item', (c) => {
      const items = Object.values(state(store).inventory);
      return c.json({ total: items.length, size: items.length, inventoryItems: items });
    });
    app.post('/sell/inventory/v1/offer', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      const offer = { offerId: `offer-${String(current.offers.length + 1).padStart(6, '0')}`, sku: body.sku ?? 'SKU-EMULATOR-1', marketplaceId: body.marketplaceId ?? 'EBAY_US', status: 'UNPUBLISHED', createdDate: fixedNow };
      current.offers.push(offer);
      return c.json(offer, 201);
    });
    app.get('/ebay-seller/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'eBay Seller API emulator';
export const endpoints = 'OAuth token, inventory items, offers';
export const initConfig = { 'ebay-seller': { clientId: 'ebay-emulator-client', clientSecret: 'ebay-emulator-secret' } };

export default plugin;
