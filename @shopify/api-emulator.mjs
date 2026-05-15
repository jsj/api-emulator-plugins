import { fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'shopify:state';

function defaultState() {
  return {
    shop: { id: 100001, name: 'Emulator Shop', email: 'owner@example.test', domain: 'emulator.myshopify.com', myshopify_domain: 'emulator.myshopify.com', created_at: fixedNow },
    products: [{ id: 900001, title: 'Emulator T-Shirt', handle: 'emulator-t-shirt', status: 'active', vendor: 'API Emulator', product_type: 'Apparel', created_at: fixedNow, updated_at: fixedNow, variants: [{ id: 910001, product_id: 900001, title: 'Default Title', price: '20.00', sku: 'EMU-TSHIRT' }] }],
    orders: [{ id: 800001, name: '#1001', email: 'customer@example.test', financial_status: 'paid', fulfillment_status: null, created_at: fixedNow, total_price: '20.00', currency: 'USD' }],
  };
}

const state = (store) => getState(store, STATE_KEY, defaultState);

export function seedFromConfig(store, baseUrl = 'https://emulator.myshopify.com', config = {}) {
  return setState(store, STATE_KEY, { ...defaultState(), baseUrl, ...config });
}

export const contract = {
  provider: 'shopify',
  source: 'Shopify Admin REST and GraphQL API documented subset',
  docs: 'https://shopify.dev/docs/api',
  baseUrl: 'https://{shop}.myshopify.com/admin/api/{version}',
  scope: ['shop', 'products', 'orders', 'graphql'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'shopify',
  register(app, store) {
    app.get('/admin/api/:version/shop.json', (c) => c.json({ shop: state(store).shop }));
    app.get('/admin/api/:version/products.json', (c) => c.json({ products: state(store).products }));
    app.post('/admin/api/:version/products.json', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      const product = { id: 900001 + current.products.length, status: 'active', created_at: fixedNow, updated_at: fixedNow, variants: [], ...(body.product ?? body) };
      current.products.push(product);
      return c.json({ product }, 201);
    });
    app.get('/admin/api/:version/products/:id.json', (c) => {
      const product = state(store).products.find((item) => String(item.id) === c.req.param('id'));
      if (!product) return routeError(c, 'Not Found', 404, 'not_found');
      return c.json({ product });
    });
    app.get('/admin/api/:version/orders.json', (c) => c.json({ orders: state(store).orders }));
    app.post('/admin/api/:version/graphql.json', async (c) => {
      const body = await readBody(c);
      if ((body.query ?? '').includes('shop')) return c.json({ data: { shop: { name: state(store).shop.name, myshopifyDomain: state(store).shop.myshopify_domain } } });
      return c.json({ data: { products: { edges: state(store).products.map((product) => ({ node: { id: `gid://shopify/Product/${product.id}`, title: product.title, handle: product.handle } })) } } });
    });
    app.get('/shopify/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Shopify Admin API emulator';
export const endpoints = 'shop, products, orders, GraphQL';
export const initConfig = { shopify: { shop: 'emulator.myshopify.com', adminToken: 'shpat_emulator' } };

export default plugin;
