const STATE_KEY = 'uber:state';

function now() {
  return new Date().toISOString();
}

function initialState(config = {}) {
  return {
    profile: config.profile ?? { uuid: 'uber_user_seed', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' },
    products: config.products ?? [{ product_id: 'uberx', display_name: 'UberX', capacity: 4, description: 'Everyday rides' }],
    paymentMethods: config.paymentMethods ?? [{ payment_method_id: 'payment_emulator', type: 'card', description: 'Visa •••• 4242' }],
    places: config.places ?? { home: { address: '1 Market St, San Francisco, CA' }, work: { address: '500 Howard St, San Francisco, CA' } },
    promotions: config.promotions ?? [{ display_text: 'Emulator promo', localized_value: '$5 off' }],
    requests: config.requests ?? [],
    deliveryQuotes: config.deliveryQuotes ?? [],
    deliveries: config.deliveries ?? [],
    stores: config.stores ?? [{ id: 'store_emulator', name: 'Uber Eats Emulator Store', status: 'ONLINE' }],
    reports: config.reports ?? [],
    menus: config.menus ?? {
      store_emulator: {
        id: 'menu_emulator',
        title: { translations: { en_us: 'Emulator Menu' } },
        categories: [{ id: 'cat_main', title: { translations: { en_us: 'Main' } }, entities: [{ id: 'item_burger' }] }],
        items: [{ id: 'item_burger', title: { translations: { en_us: 'API Burger' } }, price_info: { price: 1299 } }],
      },
    },
    orders: config.orders ?? [{ id: 'order_seed', store_id: 'store_emulator', status: 'accepted', cart: { items: [{ id: 'item_burger', quantity: 1 }] } }],
    webhooks: config.webhooks ?? [],
    nextRequest: 1,
    nextQuote: 1,
    nextDelivery: 1,
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

async function jsonBody(c) {
  return c.req.json().catch(() => ({}));
}

function rideRequest(s, body) {
  const id = `request_${s.nextRequest++}`;
  return {
    request_id: id,
    status: 'processing',
    product_id: body.product_id ?? 'uberx',
    driver: { name: 'Emulator Driver', phone_number: '+14155550123', rating: 4.98 },
    vehicle: { make: 'Toyota', model: 'Prius', license_plate: 'API123' },
    location: { latitude: body.start_latitude ?? 37.7749, longitude: body.start_longitude ?? -122.4194 },
    pickup: { latitude: body.start_latitude, longitude: body.start_longitude },
    destination: { latitude: body.end_latitude, longitude: body.end_longitude },
    eta: 5,
    created_at: now(),
  };
}

function deliveryQuote(s, customerId, body) {
  return {
    id: `del_quote_${s.nextQuote++}`,
    customer_id: customerId,
    kind: 'delivery_quote',
    fee: body.fee ?? 699,
    currency: body.currency ?? 'USD',
    duration: 1800,
    expires: new Date(Date.now() + 15 * 60_000).toISOString(),
    pickup_address: body.pickup_address,
    dropoff_address: body.dropoff_address,
  };
}

function directDelivery(s, customerId, body) {
  const id = `del_${s.nextDelivery++}`;
  return {
    id,
    customer_id: customerId,
    status: 'pending',
    tracking_url: `https://delivery.uber.com/${id}`,
    courier: { name: 'Emulator Courier', phone_number: '+14155550999' },
    pickup_address: body.pickup_address,
    dropoff_address: body.dropoff_address,
    manifest_items: body.manifest_items ?? [],
    created: now(),
    updated: now(),
  };
}

export const contract = {
  provider: 'uber',
  source: 'Uber Rides, Direct, and Eats API-compatible subset',
  docs: 'https://developer.uber.com/docs',
  scope: ['riders-profile', 'riders-products', 'riders-estimates', 'riders-requests', 'riders-history', 'payment-methods', 'places', 'promotions', 'sandbox', 'direct-delivery', 'direct-webhooks', 'eats-stores', 'eats-menus', 'eats-orders', 'eats-reports', 'eats-webhooks', 'state-inspection'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'uber',
  register(app, store) {
    app.get('/v1/me', (c) => c.json(state(store).profile));
    app.get('/v1.2/me', (c) => c.json(state(store).profile));
    app.patch('/v1.2/me', async (c) => {
      const s = state(store);
      Object.assign(s.profile, await jsonBody(c));
      saveState(store, s);
      return c.json(s.profile);
    });
    app.get('/v1/products', (c) => c.json({ products: state(store).products }));
    app.get('/v1.2/products/:productId', (c) => {
      const product = state(store).products.find((item) => item.product_id === c.req.param('productId'));
      return product ? c.json(product) : c.json({ code: 'not_found', message: 'Product not found' }, 404);
    });
    app.get('/v1/estimates/price', (c) => c.json({ prices: state(store).products.map((product) => ({ product_id: product.product_id, display_name: product.display_name, estimate: '$12-16', low_estimate: 12, high_estimate: 16, currency_code: 'USD' })) }));
    app.get('/v1/estimates/time', (c) => c.json({ times: state(store).products.map((product) => ({ product_id: product.product_id, display_name: product.display_name, estimate: 300 })) }));
    app.get('/v1.2/history', (c) => c.json({ history: state(store).requests, count: state(store).requests.length }));
    app.get('/v1.2/payment-methods', (c) => c.json({ payment_methods: state(store).paymentMethods }));
    app.get('/v1.2/payment-methods/:paymentMethodId', (c) => {
      const method = state(store).paymentMethods.find((item) => item.payment_method_id === c.req.param('paymentMethodId'));
      return method ? c.json(method) : c.json({ code: 'not_found', message: 'Payment method not found' }, 404);
    });
    app.patch('/v1.2/payment-methods/:paymentMethodId', async (c) => c.json({ payment_method_id: c.req.param('paymentMethodId'), ...(await jsonBody(c)) }));
    app.delete('/v1.2/payment-methods/:paymentMethodId', (c) => c.json({ payment_method_id: c.req.param('paymentMethodId'), deleted: true }));
    app.get('/v1.2/places/:placeId', (c) => c.json(state(store).places[c.req.param('placeId')] ?? { address: null }));
    app.put('/v1.2/places/:placeId', async (c) => {
      const s = state(store);
      s.places[c.req.param('placeId')] = await jsonBody(c);
      saveState(store, s);
      return c.json(s.places[c.req.param('placeId')]);
    });
    app.get('/v1.2/me/promotions', (c) => c.json({ promotions: state(store).promotions }));
    app.post('/v1.2/me/vouchers/redeem', async (c) => c.json({ status: 'redeemed', ...(await jsonBody(c)) }));
    app.post('/v1.2/requests/estimate', async (c) => c.json({ fare: { value: 14.25, currency_code: 'USD' }, trip: await jsonBody(c) }));

    app.post('/v1.2/requests', async (c) => {
      const s = state(store);
      const request = rideRequest(s, await jsonBody(c));
      s.requests.push(request);
      saveState(store, s);
      return c.json(request, 202);
    });
    app.get('/v1.2/requests/current', (c) => c.json(state(store).requests.at(-1) ?? { status: 'no_current_trip' }));
    app.patch('/v1.2/requests/current', async (c) => {
      const s = state(store);
      const request = s.requests.at(-1);
      if (!request) return c.json({ code: 'not_found', message: 'Request not found' }, 404);
      Object.assign(request, await jsonBody(c));
      saveState(store, s);
      return c.json(request);
    });
    app.delete('/v1.2/requests/current', (c) => {
      const s = state(store);
      const request = s.requests.at(-1);
      if (!request) return c.json({ code: 'not_found', message: 'Request not found' }, 404);
      request.status = 'rider_canceled';
      saveState(store, s);
      return c.json(request);
    });
    app.get('/v1.2/requests/:requestId', (c) => {
      const request = state(store).requests.find((item) => item.request_id === c.req.param('requestId'));
      return request ? c.json(request) : c.json({ code: 'not_found', message: 'Request not found' }, 404);
    });
    app.delete('/v1.2/requests/:requestId', (c) => {
      const s = state(store);
      const request = s.requests.find((item) => item.request_id === c.req.param('requestId'));
      if (!request) return c.json({ code: 'not_found', message: 'Request not found' }, 404);
      request.status = 'rider_canceled';
      saveState(store, s);
      return c.json(request);
    });
    app.patch('/v1.2/requests/:requestId', async (c) => {
      const s = state(store);
      const request = s.requests.find((item) => item.request_id === c.req.param('requestId'));
      if (!request) return c.json({ code: 'not_found', message: 'Request not found' }, 404);
      Object.assign(request, await jsonBody(c));
      saveState(store, s);
      return c.json(request);
    });
    app.get('/v1.2/requests/:requestId/map', (c) => c.json({ request_id: c.req.param('requestId'), href: `https://m.uber.com/ul/?request_id=${c.req.param('requestId')}` }));
    app.get('/v1.2/requests/:requestId/receipt', (c) => c.json({ request_id: c.req.param('requestId'), total_charged: '$14.25', total_owed: null, currency_code: 'USD', charge_adjustments: [] }));
    app.put('/v1.2/sandbox/products/:productId', async (c) => c.json({ product_id: c.req.param('productId'), ...(await jsonBody(c)) }));
    app.put('/v1.2/sandbox/requests/:requestId', async (c) => c.json({ request_id: c.req.param('requestId'), ...(await jsonBody(c)) }));
    app.get('/v1.2/sandbox/map', (c) => c.json({ href: 'https://sandbox.uber.com/map/emulator' }));

    app.post('/v1/customers/:customerId/delivery_quotes', async (c) => {
      const s = state(store);
      const quote = deliveryQuote(s, c.req.param('customerId'), await jsonBody(c));
      s.deliveryQuotes.push(quote);
      saveState(store, s);
      return c.json(quote, 200);
    });
    app.post('/v1/customers/:customerId/deliveries', async (c) => {
      const s = state(store);
      const delivery = directDelivery(s, c.req.param('customerId'), await jsonBody(c));
      s.deliveries.push(delivery);
      saveState(store, s);
      return c.json(delivery, 201);
    });
    app.get('/v1/customers/:customerId/deliveries/:deliveryId', (c) => {
      const delivery = state(store).deliveries.find((item) => item.id === c.req.param('deliveryId') && item.customer_id === c.req.param('customerId'));
      return delivery ? c.json(delivery) : c.json({ code: 'not_found', message: 'Delivery not found' }, 404);
    });
    app.post('/v1/customers/:customerId/deliveries/:deliveryId/cancel', (c) => {
      const s = state(store);
      const delivery = s.deliveries.find((item) => item.id === c.req.param('deliveryId') && item.customer_id === c.req.param('customerId'));
      if (!delivery) return c.json({ code: 'not_found', message: 'Delivery not found' }, 404);
      delivery.status = 'canceled';
      delivery.updated = now();
      saveState(store, s);
      return c.json(delivery);
    });
    app.get('/v1/customers/:customerId/deliveries/:deliveryId/proof-of-delivery', (c) => c.json({ delivery_id: c.req.param('deliveryId'), signature_url: 'https://delivery.uber.com/proof/signature_emulator.png', photo_url: 'https://delivery.uber.com/proof/photo_emulator.jpg' }));
    app.post('/event.delivery_status', async (c) => {
      const s = state(store);
      s.webhooks.push({ type: 'event.delivery_status', payload: await jsonBody(c), received_at: now() });
      saveState(store, s);
      return c.json({ ok: true });
    });
    app.post('/event.courier_update', async (c) => {
      const s = state(store);
      s.webhooks.push({ type: 'event.courier_update', payload: await jsonBody(c), received_at: now() });
      saveState(store, s);
      return c.json({ ok: true });
    });

    app.get('/eats/stores', (c) => c.json({ stores: state(store).stores }));
    app.get('/eats/stores/:storeId', (c) => c.json(state(store).stores.find((item) => item.id === c.req.param('storeId')) ?? { code: 'not_found' }));
    app.patch('/eats/stores/:storeId', async (c) => c.json({ id: c.req.param('storeId'), ...(await jsonBody(c)) }));
    app.get('/eats/stores/:storeId/menu', (c) => c.json(state(store).menus[c.req.param('storeId')] ?? { categories: [], items: [] }));
    app.put('/eats/stores/:storeId/menu', async (c) => {
      const s = state(store);
      s.menus[c.req.param('storeId')] = await jsonBody(c);
      saveState(store, s);
      return c.json(s.menus[c.req.param('storeId')]);
    });
    app.get('/eats/stores/:storeId/menus', (c) => c.json(state(store).menus[c.req.param('storeId')] ?? { categories: [], items: [] }));
    app.put('/eats/stores/:storeId/menus', async (c) => {
      const s = state(store);
      s.menus[c.req.param('storeId')] = await jsonBody(c);
      saveState(store, s);
      return c.json(s.menus[c.req.param('storeId')]);
    });
    app.get('/eats/stores/:storeId/menu/sections/:sectionId', (c) => c.json({ id: c.req.param('sectionId'), store_id: c.req.param('storeId'), title: { translations: { en_us: 'Main' } } }));
    app.post('/eats/stores/:storeId/menus/items/:itemId', async (c) => c.json({ id: c.req.param('itemId'), store_id: c.req.param('storeId'), ...(await jsonBody(c)) }));
    app.get('/eats/store/:storeId/status', (c) => c.json({ store_id: c.req.param('storeId'), status: 'ONLINE' }));
    app.post('/eats/store/:storeId/status', async (c) => c.json({ store_id: c.req.param('storeId'), ...(await jsonBody(c)) }));
    app.get('/eats/stores/:storeId/holiday-hours', (c) => c.json({ holiday_hours: [] }));
    app.post('/eats/stores/:storeId/holiday-hours', async (c) => c.json({ store_id: c.req.param('storeId'), holiday_hours: await jsonBody(c) }));
    app.get('/eats/stores/:storeId/pos_data', (c) => c.json({ store_id: c.req.param('storeId'), integration_enabled: true }));
    app.patch('/eats/stores/:storeId/pos_data', async (c) => c.json({ store_id: c.req.param('storeId'), ...(await jsonBody(c)) }));
    app.delete('/eats/stores/:storeId/pos_data', (c) => c.json({ store_id: c.req.param('storeId'), deleted: true }));
    app.get('/eats/stores/:storeId/orders', (c) => c.json({ orders: state(store).orders.filter((order) => order.store_id === c.req.param('storeId')) }));
    app.get('/eats/stores/:storeId/created-orders', (c) => c.json({ orders: state(store).orders.filter((order) => order.store_id === c.req.param('storeId') && order.status === 'created') }));
    app.get('/eats/stores/:storeId/canceled-orders', (c) => c.json({ orders: state(store).orders.filter((order) => order.store_id === c.req.param('storeId') && order.status === 'canceled') }));
    app.get('/eats/orders/:orderId', (c) => {
      const order = state(store).orders.find((item) => item.id === c.req.param('orderId'));
      return order ? c.json(order) : c.json({ code: 'not_found', message: 'Order not found' }, 404);
    });
    app.get('/eats/order/:orderId', (c) => {
      const order = state(store).orders.find((item) => item.id === c.req.param('orderId'));
      return order ? c.json(order) : c.json({ code: 'not_found', message: 'Order not found' }, 404);
    });
    app.post('/eats/orders/:orderId/accept', (c) => {
      const s = state(store);
      const order = s.orders.find((item) => item.id === c.req.param('orderId'));
      if (!order) return c.json({ code: 'not_found', message: 'Order not found' }, 404);
      order.status = 'accepted';
      saveState(store, s);
      return c.json(order);
    });
    app.post('/eats/orders/:orderId/accept_pos_order', (c) => c.json({ id: c.req.param('orderId'), status: 'accepted' }));
    app.post('/eats/orders/:orderId/deny_pos_order', (c) => c.json({ id: c.req.param('orderId'), status: 'denied' }));
    app.post('/eats/orders/:orderId/cancel', (c) => c.json({ id: c.req.param('orderId'), status: 'canceled' }));
    app.patch('/eats/orders/:orderId/cart', async (c) => c.json({ id: c.req.param('orderId'), cart: await jsonBody(c) }));
    app.post('/eats/orders/:orderId/restaurantdelivery/status', async (c) => c.json({ id: c.req.param('orderId'), restaurant_delivery: await jsonBody(c) }));
    app.post('/eats/report', async (c) => {
      const s = state(store);
      const report = { id: `report_${Date.now()}`, status: 'requested', request: await jsonBody(c) };
      s.reports.push(report);
      saveState(store, s);
      return c.json(report, 202);
    });
    app.post('/eats.webhook', async (c) => {
      const s = state(store);
      s.webhooks.push({ type: 'eats.webhook', payload: await jsonBody(c), received_at: now() });
      saveState(store, s);
      return c.json({ ok: true });
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Uber API emulator';
export const endpoints = 'Rides profile/products/requests, Direct delivery quotes/deliveries, Eats menus/orders, and state inspection';
export const capabilities = contract.scope;
export const initConfig = { uber: initialState() };
export default plugin;
