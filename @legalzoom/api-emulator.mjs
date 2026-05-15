const STATE_KEY = 'legalzoom:state';
const NOW = '2026-05-15T12:00:00Z';

function initialState(config = {}) {
  return {
    customers: [{ id: 'cust_ada', email: 'ada@example.com', name: 'Ada Lovelace', created_at: NOW }],
    products: [
      { id: 'prod_llc', name: 'LLC Formation', category: 'business_formation', jurisdiction_required: true },
      { id: 'prod_registered_agent', name: 'Registered Agent', category: 'compliance', jurisdiction_required: true },
    ],
    orders: [{ id: 'order_1', customer_id: 'cust_ada', status: 'in_progress', product_id: 'prod_llc', jurisdiction: 'DE', created_at: NOW }],
    formations: [{ id: 'formation_1', order_id: 'order_1', entity_name: 'Emulator Legal LLC', entity_type: 'LLC', jurisdiction: 'DE', status: 'draft' }],
    documents: [{ id: 'doc_articles', order_id: 'order_1', name: 'Articles of Organization', status: 'draft', download_url: 'https://example.com/legalzoom/articles.pdf' }],
    nextId: 2,
    ...config,
  };
}

function state(store) {
  const current = store.getData?.(STATE_KEY);
  if (current) return current;
  const next = initialState();
  store.setData?.(STATE_KEY, next);
  return next;
}

function saveState(store, next) {
  store.setData?.(STATE_KEY, next);
}

async function json(c) {
  return c.req.json().catch(() => ({}));
}

function list(data) {
  return { data, has_more: false };
}

function error(c, message, status = 400) {
  return c.json({ error: { code: status === 404 ? 'not_found' : 'bad_request', message } }, status);
}

export const contract = {
  provider: 'legalzoom',
  source: 'LegalZoom product integration surface-informed commerce/legal services subset',
  docs: 'https://www.legalzoom.com/',
  baseUrl: 'https://api.legalzoom.com',
  scope: ['customers', 'products', 'orders', 'business-formations', 'documents', 'inspection'],
  fidelity: 'stateful-rest-emulator',
  notes: 'No public official LegalZoom API reference was found; this models a safe local order and business-formation slice.',
};

export const plugin = {
  name: 'legalzoom',
  register(app, store) {
    app.get('/v1/customers', (c) => c.json(list(state(store).customers)));
    app.post('/v1/customers', async (c) => {
      const s = state(store);
      const body = await json(c);
      const customer = { id: `cust_${s.nextId++}`, created_at: new Date().toISOString(), ...body };
      s.customers.push(customer);
      saveState(store, s);
      return c.json(customer, 201);
    });
    app.get('/v1/products', (c) => c.json(list(state(store).products)));
    app.get('/v1/orders', (c) => c.json(list(state(store).orders)));
    app.post('/v1/orders', async (c) => {
      const s = state(store);
      const body = await json(c);
      const order = { id: `order_${s.nextId++}`, status: 'in_progress', created_at: new Date().toISOString(), ...body };
      s.orders.push(order);
      saveState(store, s);
      return c.json(order, 201);
    });
    app.get('/v1/orders/:orderId', (c) => {
      const order = state(store).orders.find((item) => item.id === c.req.param('orderId'));
      return order ? c.json(order) : error(c, 'Order not found', 404);
    });
    app.post('/v1/business-formations', async (c) => {
      const s = state(store);
      const body = await json(c);
      const formation = { id: `formation_${s.nextId++}`, status: 'draft', ...body };
      s.formations.push(formation);
      saveState(store, s);
      return c.json(formation, 201);
    });
    app.get('/v1/business-formations/:formationId', (c) => {
      const formation = state(store).formations.find((item) => item.id === c.req.param('formationId'));
      return formation ? c.json(formation) : error(c, 'Formation not found', 404);
    });
    app.get('/v1/orders/:orderId/documents', (c) => c.json(list(state(store).documents.filter((document) => document.order_id === c.req.param('orderId')))));
    app.get('/v1/documents/:documentId', (c) => {
      const document = state(store).documents.find((item) => item.id === c.req.param('documentId'));
      return document ? c.json(document) : error(c, 'Document not found', 404);
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'LegalZoom API emulator';
export const endpoints = 'Customers, products, orders, business formations, and order documents';
export const capabilities = contract.scope;
export const initConfig = { legalzoom: initialState() };
export default plugin;
